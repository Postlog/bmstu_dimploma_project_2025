import { runMealy } from '../mealy.js';

/**
 * Виртуализированный редактор кода
 * Рендерит только видимые строки для оптимальной производительности
 */
class VirtualizedCodeEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            lineHeight: options.lineHeight || 20,
            fontSize: options.fontSize || 14,
            fontFamily: options.fontFamily || 'Courier New, monospace',
            padding: options.padding || 12,
            overscan: options.overscan || 5, // количество дополнительных строк для рендера
            currentLineHighlight: options.currentLineHighlight || '#2d2d30', // цвет подсветки текущей строки
            ...options,
        };

        this.lines = [];
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.totalHeight = 0;

        this.automaton = null;
        this.rules = [];

        // Для редактирования
        this.cursorLine = 0;
        this.cursorColumn = 0;
        this.isEditable = true;

        // Кэш токенов для всего текста
        this.allTokens = [];
        this.tokensPerLine = {}; // {lineNumber: [tokens]}

        // Кэш для отслеживания изменений DOM
        this.renderedLines = new Map(); // lineIndex -> {element, content, isCurrentLine}
        this.lastVisibleRange = { startLine: -1, endLine: -1 };

        // Пул элементов для переиспользования
        this.elementPool = [];
        this.maxPoolSize = 100;

        this.init();
    }

    init() {
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        this.container.style.fontFamily = this.options.fontFamily;
        this.container.style.fontSize = `${this.options.fontSize}px`;
        this.container.style.lineHeight = `${this.options.lineHeight}px`;
        this.container.style.cursor = 'pointer';
        this.container.style.setProperty('--current-line-color', this.options.currentLineHighlight);

        // Создаем скрытое текстовое поле для ввода
        this.hiddenTextarea = document.createElement('textarea');
        this.hiddenTextarea.style.position = 'absolute';
        this.hiddenTextarea.style.top = '0';
        this.hiddenTextarea.style.left = '60px'; // сдвигаем вправо от номеров строк
        this.hiddenTextarea.style.width = 'calc(100% - 60px)';
        this.hiddenTextarea.style.height = '100%';
        this.hiddenTextarea.style.background = 'transparent';
        this.hiddenTextarea.style.color = 'transparent';
        this.hiddenTextarea.style.caretColor = '#d4d4d4';
        this.hiddenTextarea.style.border = 'none';
        this.hiddenTextarea.style.outline = 'none';
        this.hiddenTextarea.style.resize = 'none';
        this.hiddenTextarea.style.fontFamily = this.options.fontFamily;
        this.hiddenTextarea.style.fontSize = `${this.options.fontSize}px`;
        this.hiddenTextarea.style.lineHeight = `${this.options.lineHeight}px`;
        this.hiddenTextarea.style.padding = `${this.options.padding}px`;
        this.hiddenTextarea.style.zIndex = '2';
        this.hiddenTextarea.style.whiteSpace = 'pre';
        this.hiddenTextarea.style.wordWrap = 'off';
        this.hiddenTextarea.style.overflow = 'hidden';
        this.hiddenTextarea.style.boxSizing = 'border-box';

        // Создаем контейнер для видимого контента (включая номера строк)
        this.viewport = document.createElement('div');
        this.viewport.style.position = 'absolute';
        this.viewport.style.top = '0';
        this.viewport.style.left = '0';
        this.viewport.style.right = '0';
        this.viewport.style.pointerEvents = 'none';
        this.viewport.style.zIndex = '1';

        // Создаем невидимый элемент для определения общей высоты
        this.spacer = document.createElement('div');
        this.spacer.style.position = 'absolute';
        this.spacer.style.top = '0';
        this.spacer.style.left = '0';
        this.spacer.style.width = '1px';
        this.spacer.style.pointerEvents = 'none';
        this.spacer.style.zIndex = '0';

        this.container.appendChild(this.spacer);
        this.container.appendChild(this.viewport);
        this.container.appendChild(this.hiddenTextarea);

        // Флаг для предотвращения циклической синхронизации
        this.isScrollSyncing = false;

        // Обработчики событий
        this.container.addEventListener('scroll', () => this.handleContainerScroll());
        this.hiddenTextarea.addEventListener('input', () => this.handleInput());
        this.hiddenTextarea.addEventListener('scroll', () => this.handleTextareaScroll());
        this.hiddenTextarea.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.hiddenTextarea.addEventListener('keyup', () => this.updateCursorPosition()); // отслеживаем отпускание клавиш
        this.hiddenTextarea.addEventListener('click', () => this.handleTextareaClick());
        this.hiddenTextarea.addEventListener('focus', () => this.handleTextareaFocus());
        this.hiddenTextarea.addEventListener('selectionchange', () => this.updateCursorPosition()); // отслеживаем изменение выделения
        window.addEventListener('resize', () => this.handleResize());

        this.updateContainerHeight();
    }

    initLinesPool(count) {
        for (let i = 0; i < count; i++) {
            const line = document.createElement('div');
            line.style.position = 'absolute';
            line.style.top = '0';
        }
    }

    setAutomaton(automaton, rules) {
        this.automaton = automaton;
        this.rules = rules;
        this.invalidateTokens(); // пересчитываем токены при смене автомата
        this.render();
    }

    setText(text) {
        this.lines = text.split('\n');
        this.totalHeight = this.lines.length * this.options.lineHeight + this.options.padding * 2;
        this.spacer.style.height = `${this.totalHeight}px`;
        this.hiddenTextarea.value = text;
        this.updateTextareaHeight();
        this.updateCursorPosition(); // обновляем позицию курсора
        this.invalidateTokens(); // пересчитываем токены при смене текста
        this.render();
    }

    getText() {
        return this.hiddenTextarea.value;
    }

    updateTextareaHeight() {
    // Устанавливаем высоту textarea равной общей высоте контента
        this.hiddenTextarea.style.height = `${this.totalHeight}px`;
    }

    handleInput() {
        const text = this.hiddenTextarea.value;
        this.lines = text.split('\n');
        this.totalHeight = this.lines.length * this.options.lineHeight + this.options.padding * 2;
        this.spacer.style.height = `${this.totalHeight}px`;
        this.updateTextareaHeight();
        this.updateCursorPosition(); // обновляем позицию курсора
        this.invalidateTokens(); // пересчитываем токены при изменении текста
        this.render(); // Используем debounced версию для лучшей производительности
    }

    handleKeyDown(e) {
    // Обрабатываем специальные клавиши если нужно
        if (e.key === 'Tab') {
            e.preventDefault();
            this.insertText('    '); // 4 пробела вместо табуляции
        }

        // Обновляем позицию курсора после нажатия клавиш
        setTimeout(() => this.updateCursorPosition(), 0);
    }

    handleTextareaClick() {
    // Обновляем рендер при клике для корректного позиционирования
        this.updateCursorPosition();
        setTimeout(() => this.render(), 0);
    }

    handleTextareaFocus() {
    // Обновляем рендер при фокусе
        this.updateCursorPosition();
        setTimeout(() => this.render(), 0);
    }

    insertText(text) {
        const textarea = this.hiddenTextarea;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;

        textarea.value = value.slice(0, start) + text + value.slice(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;

        this.handleInput();
    }

    handleContainerScroll() {
        if (this.isScrollSyncing) {return;}

        this.isScrollSyncing = true;
        this.scrollTop = this.container.scrollTop;

        this.hiddenTextarea.scrollTop = this.scrollTop;
        this.hiddenTextarea.scrollLeft = this.container.scrollLeft;
        this.render();
        this.isScrollSyncing = false;
    }

    handleTextareaScroll() {
        if (this.isScrollSyncing) {return;}

        this.isScrollSyncing = true;

        // Синхронизируем скролл контейнера с textarea
        // requestAnimationFrame(() => {
        this.container.scrollTop = this.hiddenTextarea.scrollTop;
        this.container.scrollLeft = this.hiddenTextarea.scrollLeft;
        this.scrollTop = this.container.scrollTop;
        this.render();
        this.isScrollSyncing = false;
    // });
    }

    handleResize() {
        this.updateContainerHeight();
        this.render();
    }

    updateContainerHeight() {
        this.containerHeight = this.container.clientHeight;
    }

    getVisibleRange() {
        const startLine = Math.max(0, Math.floor((this.scrollTop - this.options.padding) / this.options.lineHeight) - this.options.overscan);
        const endLine = Math.min(
            this.lines.length - 1,
            Math.ceil((this.scrollTop + this.containerHeight - this.options.padding) / this.options.lineHeight) + this.options.overscan,
        );

        return { startLine, endLine };
    }

    // Простой хэш для определения изменений текста
    getTextHash(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Преобразуем в 32-битное число
        }
        return hash.toString(36);
    }

    // Метод для инвалидации токенов
    invalidateTokens() {
        this.allTokens = [];
        this.tokensPerLine = {};
    }

    // Метод для обработки всего текста автоматом Мили
    processAllLines() {
        const text = this.getText();

        if (!this.automaton || !this.rules || text.length === 0) {
            this.allTokens = [];
            this.tokensPerLine = {};
            return;
        }

        try {
            // Обрабатываем весь текст автоматом Мили
            this.allTokens = runMealy(this.automaton, text);

            // Распределяем токены по строкам
            this.distributeTokensToLines();
        } catch (error) {
            console.error('Ошибка обработки текста автоматом Мили:', error);
            this.allTokens = [];
            this.tokensPerLine = {};
        }
    }

    // Метод для распределения токенов по строкам
    distributeTokensToLines() {
        this.tokensPerLine = {};

        // Инициализируем массивы токенов для каждой строки
        for (let i = 0; i < this.lines.length; i++) {
            this.tokensPerLine[i] = [];
        }

        if (this.allTokens.length === 0) {
            return;
        }

        let currentLineIndex = 0;
        let currentLineStart = 0;

        // Распределяем токены по строкам
        for (const token of this.allTokens) {
            // Находим строку, в которой начинается токен
            while (currentLineIndex < this.lines.length - 1 &&
                token.start >= currentLineStart + this.lines[currentLineIndex].length + 1) {
                currentLineStart += this.lines[currentLineIndex].length + 1; // +1 для символа новой строки
                currentLineIndex++;
            }

            const tokenStartInLine = token.start - currentLineStart;
            const tokenEndInLine = token.end - currentLineStart;

            // Проверяем, не выходит ли токен за пределы текущей строки
            if (tokenEndInLine < this.lines[currentLineIndex].length) {
                // Токен полностью в одной строке
                this.tokensPerLine[currentLineIndex].push({
                    start: tokenStartInLine,
                    end: tokenEndInLine,
                    style: token.style,
                });
            } else {
                // Токен пересекает несколько строк - разбиваем его
                let remainingStart = token.start;
                const remainingEnd = token.end;
                let lineIdx = currentLineIndex;
                let lineStart = currentLineStart;

                while (remainingStart <= remainingEnd && lineIdx < this.lines.length) {
                    const lineEnd = lineStart + this.lines[lineIdx].length - 1;
                    const tokenStartInCurrentLine = remainingStart - lineStart;
                    const tokenEndInCurrentLine = Math.min(remainingEnd, lineEnd) - lineStart;

                    if (tokenStartInCurrentLine <= this.lines[lineIdx].length - 1) {
                        this.tokensPerLine[lineIdx].push({
                            start: tokenStartInCurrentLine,
                            end: tokenEndInCurrentLine,
                            style: token.style,
                        });
                    }

                    remainingStart = lineStart + this.lines[lineIdx].length + 1;
                    lineStart += this.lines[lineIdx].length + 1;
                    lineIdx++;
                }
            }
        }
    }

    highlightLine(lineText, lineNumber) {
    // Получаем токены для данной строки
        const tokens = this.tokensPerLine[lineNumber] || [];

        return this.tokensToHtml(lineText, tokens);
    }

    tokensToHtml(text, tokens) {
        if (!this.rules || this.rules.length === 0) {
            return this.escapeHtml(text);
        }

        // Создаем карту стилей из правил
        const styleMap = {};
        this.rules.forEach(rule => {
            styleMap[rule.Name] = rule.Style;
        });

        let html = '';
        let lastPos = 0;

        tokens.forEach(token => {
            // Добавляем неразмеченный текст перед токеном
            if (token.start > lastPos) {
                html += this.escapeHtml(text.slice(lastPos, token.start));
            }

            // Добавляем размеченный токен
            const tokenText = text.slice(token.start, token.end + 1);
            const style = styleMap[token.style];

            if (style) {
                let cssStyle = `color: ${style.Color};`;
                if (style.Bold) {cssStyle += ' font-weight: bold;';}
                if (style.Italic) {cssStyle += ' font-style: italic;';}

                html += `<span style="${cssStyle}">${this.escapeHtml(tokenText)}</span>`;
            } else {
                html += this.escapeHtml(tokenText);
            }

            lastPos = token.end + 1;
        });

        // Добавляем оставшийся неразмеченный текст
        if (lastPos < text.length) {
            html += this.escapeHtml(text.slice(lastPos));
        }

        return html || '&nbsp;'; // пустая строка должна иметь высоту
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML || '&nbsp;';
    }

    // Оптимизированный рендер с debouncing
    render() {
        if (this.lines.length === 0) {
            this.viewport.innerHTML = '';
            this.renderedLines.clear();
            this.returnAllElementsToPool();
            return;
        }

        this.processAllLines();

        const { startLine, endLine } = this.getVisibleRange();

        const currentRange = { startLine, endLine };

        // Если диапазон не изменился, проверяем только содержимое
        if (this.lastVisibleRange.startLine === startLine && this.lastVisibleRange.endLine === endLine) {
            this.updateChangedLines(startLine, endLine);
        } else {
            // Диапазон изменился - нужно обновить структуру
            this.updateVisibleRange(startLine, endLine);
        }

        this.lastVisibleRange = currentRange;

        // Позиционируем viewport
        const translateY = `translateY(${startLine * this.options.lineHeight + this.options.padding}px)`;
        this.viewport.style.transform = translateY;
    }

    updateChangedLines(startLine, endLine) {
    // Обновляем только изменившиеся строки
        for (let i = startLine; i <= endLine; i++) {
            const lineData = this.renderedLines.get(i);
            if (!lineData) {continue;}

            const newContentHash = this.getLineContentHash(i);
            const isCurrentLine = i === this.cursorLine;

            // Проверяем, изменилось ли содержимое или статус текущей строки
            if (lineData.content !== newContentHash || lineData.isCurrentLine !== isCurrentLine) {
                // Обновляем элемент без полной пересборки
                this.updateLineElement(lineData.element, i);

                this.renderedLines.set(i, {
                    element: lineData.element,
                    content: newContentHash,
                    isCurrentLine,
                });
            }
        }
    }

    updateVisibleRange(startLine, endLine) {
    // Удаляем строки, которые больше не видны
        for (const [lineIndex, lineData] of this.renderedLines) {
            if (lineIndex < startLine || lineIndex > endLine) {
                if (lineData.element && lineData.element.parentNode) {
                    lineData.element.remove();
                    this.returnElementToPool(lineData.element);
                }

                this.renderedLines.delete(lineIndex);
            }
        }

        // Создаем DocumentFragment для новых элементов
        const fragment = document.createDocumentFragment();
        const elementsToAdd = [];

        for (let i = startLine; i <= endLine; i++) {
            if (!this.renderedLines.has(i)) {
                const lineElement = this.createOptimizedLineElement(i);

                elementsToAdd.push({
                    index: i,
                    element: lineElement,
                    content: this.getLineContentHash(i),
                    isCurrentLine: i === this.cursorLine,
                });

                fragment.appendChild(lineElement);
            }
        }

        // Добавляем новые элементы одной операцией
        if (fragment.children.length > 0) {
            this.viewport.appendChild(fragment);
        }

        // Обновляем кэш для новых элементов
        elementsToAdd.forEach(item => {
            this.renderedLines.set(item.index, {
                element: item.element,
                content: item.content,
                isCurrentLine: item.isCurrentLine,
            });
        });

        // Сортируем элементы в правильном порядке
        this.reorderElements(startLine, endLine);
    }

    reorderElements(startLine, endLine) {
        const elements = [];
        for (let i = startLine; i <= endLine; i++) {
            const lineData = this.renderedLines.get(i);
            if (lineData && lineData.element) {
                elements.push(lineData.element);
            }
        }

        // Перестраиваем порядок элементов если нужно
        elements.forEach((element, index) => {
            const expectedIndex = index;
            const currentIndex = Array.from(this.viewport.children).indexOf(element);

            if (currentIndex !== expectedIndex) {
                if (expectedIndex < this.viewport.children.length) {
                    this.viewport.insertBefore(element, this.viewport.children[expectedIndex]);
                } else {
                    this.viewport.appendChild(element);
                }
            }
        });
    }

    // Оптимизированное создание элемента строки
    createOptimizedLineElement(lineIndex) {
        const line = this.lines[lineIndex] || '';
        const isCurrentLine = lineIndex === this.cursorLine;

        // Переиспользуем элемент из пула
        const lineContainer = this.createLineElement();

        // Устанавливаем стили через CSS классы вместо inline стилей
        lineContainer.className = `line-container ${isCurrentLine ? 'current-line' : ''}`;
        lineContainer.style.height = `${this.options.lineHeight}px`;
        lineContainer.style.lineHeight = `${this.options.lineHeight}px`;

        // Создаем номер строки
        const lineNumberElement = document.createElement('div');
        lineNumberElement.className = `line-number ${isCurrentLine ? 'current-line' : ''}`;
        lineNumberElement.textContent = (lineIndex + 1).toString();

        // Создаем контент строки
        const lineContentElement = document.createElement('div');
        lineContentElement.className = 'line-content';
        lineContentElement.innerHTML = this.highlightLine(line, lineIndex);

        lineContainer.appendChild(lineNumberElement);
        lineContainer.appendChild(lineContentElement);

        return lineContainer;
    }

    // Быстрый хэш для определения изменений содержимого строки
    getLineContentHash(lineIndex) {
        const line = this.lines[lineIndex] || '';
        const tokens = this.tokensPerLine[lineIndex] || [];
        const isCurrentLine = lineIndex === this.cursorLine;

        // Простой хэш на основе содержимого и токенов
        return `${line.length}-${tokens.length}-${isCurrentLine}`;
    }

    updateLineElement(element, lineIndex) {
        const line = this.lines[lineIndex] || '';
        const isCurrentLine = lineIndex === this.cursorLine;

        // Обновляем классы
        element.className = `line-container ${isCurrentLine ? 'current-line' : ''}`;

        // Обновляем номер строки
        const lineNumberElement = element.querySelector('.line-number');
        if (lineNumberElement) {
            lineNumberElement.className = `line-number ${isCurrentLine ? 'current-line' : ''}`;
            lineNumberElement.textContent = (lineIndex + 1).toString();
        }

        // Обновляем контент
        const lineContentElement = element.querySelector('.line-content');
        if (lineContentElement) {
            lineContentElement.innerHTML = this.highlightLine(line, lineIndex);
        }
    }

    // Система пулинга элементов для переиспользования
    createLineElement() {
        if (this.elementPool.length > 0) {
            return this.elementPool.pop();
        }

        const element = document.createElement('div');
        return element;
    }

    returnElementToPool(element) {
        if (this.elementPool.length < this.maxPoolSize) {
            // Очищаем элемент перед возвратом в пул
            element.className = '';
            element.style.cssText = '';
            element.innerHTML = '';
            this.elementPool.push(element);
        }
    }

    returnAllElementsToPool() {
        for (const [, lineData] of this.renderedLines) {
            if (lineData.element) {
                this.returnElementToPool(lineData.element);
            }
        }
        this.renderedLines.clear();
    }

    // Метод для прокрутки к определенной строке
    scrollToLine(lineNumber) {
        const targetScrollTop = Math.max(0, (lineNumber - 1) * this.options.lineHeight);

        // Плавная прокрутка
        this.isScrollSyncing = true;

        this.container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth',
        });

        // Синхронизируем textarea после завершения анимации
        setTimeout(() => {
            this.hiddenTextarea.scrollTop = targetScrollTop;
            this.scrollTop = targetScrollTop;
            this.render();
            this.isScrollSyncing = false;
        }, 300); // Время анимации smooth scroll
    }

    // Метод для фокуса на редакторе
    focus() {
        this.hiddenTextarea.focus();
    }

    // Метод для получения/установки позиции курсора
    getCursorPosition() {
        return {
            start: this.hiddenTextarea.selectionStart,
            end: this.hiddenTextarea.selectionEnd,
        };
    }

    setCursorPosition(start, end = start) {
        this.hiddenTextarea.selectionStart = start;
        this.hiddenTextarea.selectionEnd = end;
        this.hiddenTextarea.focus();

        // Обновляем позицию курсора и подсветку
        this.updateCursorPosition();

        // Прокручиваем к позиции курсора
        this.scrollToCursor();
    }

    // Метод для прокрутки к текущей позиции курсора
    scrollToCursor() {
        const cursorPos = this.getCursorPosition().start;
        const textBeforeCursor = this.getText().slice(0, cursorPos);
        const lineNumber = textBeforeCursor.split('\n').length;

        // Прокручиваем к строке с курсором
        const targetScrollTop = Math.max(0, (lineNumber - 5) * this.options.lineHeight); // -5 для отступа

        if (Math.abs(this.container.scrollTop - targetScrollTop) > this.containerHeight / 2) {
            this.scrollToLine(lineNumber);
        }
    }

    // Метод для обновления позиции курсора
    updateCursorPosition() {
        const cursorPos = this.hiddenTextarea.selectionStart;
        const textBeforeCursor = this.hiddenTextarea.value.slice(0, cursorPos);
        const newCursorLine = textBeforeCursor.split('\n').length - 1; // индекс строки (0-based)

        // Обновляем рендер только если строка изменилась
        if (newCursorLine !== this.cursorLine) {
            this.cursorLine = newCursorLine;
            this.render();
        } else {
            this.cursorLine = newCursorLine;
        }
    }

    // Очистка ресурсов при уничтожении
    destroy() {
        if (this.renderDebounceTimeout) {
            clearTimeout(this.renderDebounceTimeout);
        }

        if (this.renderRequestId) {
            cancelAnimationFrame(this.renderRequestId);
        }

        this.returnAllElementsToPool();
    }

    clearCache() {
        this.invalidateTokens();
        this.render();
    }
}

export { VirtualizedCodeEditor };
