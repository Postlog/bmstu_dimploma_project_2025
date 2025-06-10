import { buildRealTree, buildTree, calculateFragments } from '../tree/tree.js';

/**
 * Виртуализированный редактор кода
 * Рендерит только видимые строки для оптимальной производительности
 */
class VirtualizedCodeEditor {
    constructor(container, automaton, rules, options = {}) {
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
        this.scrollTop = 0; // позиция скролла
        this.containerHeight = 0;
        this.totalHeight = 0;

        // Для редактирования
        this.cursorLine = 0;
        this.cursorColumn = 0;
        this.isEditable = true;

        // Кэш токенов для всего текста
        this.allTokens = [];
        this.lexemsPerLine = {}; // {lineNumber: [tokens]}

        // Связь между листьями дерева и span элементами
        this.leafToSpan = new Map();
        this.spanToLeaf = new Map();
        this.root = null; // корень дерева

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
        this.hiddenTextarea.addEventListener('input', (e) => this.handleInput(e.target.value));
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
        const text = this.getText() || '';
        console.log('setAutomaton: text =', text);
        
        const {root, leaves} = buildTree(automaton, text);
        console.log('setAutomaton: leaves count =', leaves.length);
        
        this.root = root;
        this.rules = rules;
        this.automaton = automaton;

        // Очищаем старые связи
        this.leafToSpan.clear();
        this.spanToLeaf.clear();

        // Создаем карту позиций листьев
        this.leafPositions = new Map();
        let currentPos = 0;
        for (const leaf of leaves) {
            const leafText = leaf.getText();
            console.log('Leaf:', leafText, 'style:', leaf.style);
            this.leafPositions.set(leaf, {
                start: currentPos,
                end: currentPos + leafText.length
            });
            currentPos += leafText.length;
        }

        // Распределяем листья по строкам
        this.lexemsPerLine = this.distributeLeavesToLines(leaves);
        console.log('lexemsPerLine:', this.lexemsPerLine);
        
        // Подписываемся на изменения листьев
        for (const leaf of leaves) {
            leaf.setOnChangeCallback((changeType, args) => {
                this.handleLeafChange(leaf, changeType, args);
            });
        }
        
        // Перерисовываем
        this.renderAllLexems();
    }

    getText() {
        return this.hiddenTextarea.value;
    }

    updateTextareaHeight() {
        // Устанавливаем высоту textarea равной общей высоте контента
        this.hiddenTextarea.style.height = `${this.totalHeight}px`;
    }

    handleInput(text) {
        const oldText = this.getText();
        
        console.log('handleInput: oldText =', oldText);
        console.log('handleInput: newText =', text);
        
        this.lines = text.split('\n');
        this.totalHeight = this.lines.length * this.options.lineHeight + this.options.padding * 2;
        this.spacer.style.height = `${this.totalHeight}px`;
        this.updateTextareaHeight();
        this.updateCursorPosition(); // обновляем позицию курсора

        console.log('handleInput: recreating tree');
        
        // Пересоздаем дерево с новым текстом
        const {root, leaves} = buildTree(this.automaton, text);
        this.root = root;
        
        // Очищаем старые связи
        this.leafToSpan.clear();
        this.spanToLeaf.clear();
        this.leafPositions.clear();
        
        // Создаем карту позиций листьев
        this.leafPositions = new Map();
        let currentPos = 0;
        for (const leaf of leaves) {
            const leafText = leaf.getText();
            console.log('New leaf:', leafText, 'style:', leaf.style);
            this.leafPositions.set(leaf, {
                start: currentPos,
                end: currentPos + leafText.length
            });
            currentPos += leafText.length;
        }
        
        // Распределяем листья по строкам
        this.lexemsPerLine = this.distributeLeavesToLines(leaves);
        console.log('New lexemsPerLine:', this.lexemsPerLine);
        
        // Подписываемся на изменения листьев
        for (const leaf of leaves) {
            leaf.setOnChangeCallback((changeType, args) => {
                this.handleLeafChange(leaf, changeType, args);
            });
        }
        
        // Всегда перерисовываем
        this.renderAllLexems();
    }

    updateLeafPositions() {
        if (!this.root) return;
        
        const leaves = this.root.leaves();
        this.leafPositions.clear();
        
        let currentPos = 0;
        for (const leaf of leaves) {
            const text = leaf.getText();
            this.leafPositions.set(leaf, {
                start: currentPos,
                end: currentPos + text.length
            });
            currentPos += text.length;
        }
        
        // Обновляем распределение листьев по строкам
        this.lexemsPerLine = this.distributeLeavesToLines(leaves);
        
        // Перерисовываем
        this.renderAllLexems();
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
        setTimeout(() => this.renderAllLexems(), 0);
    }

    handleTextareaFocus() {
    // Обновляем рендер при фокусе
        this.updateCursorPosition();
        setTimeout(() => this.renderAllLexems(), 0);
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
        this.renderOnScroll();
        this.isScrollSyncing = false;
    }

    handleTextareaScroll() {
        if (this.isScrollSyncing) {return;}

        this.isScrollSyncing = true;

        // Синхронизируем скролл контейнера с textarea
        this.container.scrollTop = this.hiddenTextarea.scrollTop;
        this.container.scrollLeft = this.hiddenTextarea.scrollLeft;
        this.scrollTop = this.container.scrollTop;
        this.renderOnScroll();
        this.isScrollSyncing = false;
    }

    handleResize() {
        this.updateContainerHeight();
        this.renderOnScroll();
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

    // Метод для инвалидации токенов
    invalidateTokens() {
        this.allTokens = [];
        this.lexemsPerLine = {};
    }

    distributeLeavesToLines(leaves) {
        const lexemsPerLine = {};
        this.lexemToLeaf = new Map(); // Карта лексем к листьям
        
        // Инициализируем массивы токенов для каждой строки
        for (let i = 0; i < this.lines.length; i++) {
            lexemsPerLine[i] = [];
        }

        let currentLineIndex = 0;
        let currentLineStart = 0;
        let lexemStart = 0;
        let leafIndex = 0;
        
        // Распределяем токены по строкам
        for (const leaf of leaves) {
            const leafText = leaf.getText();
            if (!leafText || leafText.length === 0) {
                leafIndex++;
                continue;
            }
            
            const lexemEnd = lexemStart + leafText.length;

            // Находим строку, в которой начинается токен
            while (currentLineIndex < this.lines.length - 1 &&
                lexemStart >= currentLineStart + this.lines[currentLineIndex].length + 1) {
                currentLineStart += this.lines[currentLineIndex].length + 1; // +1 для символа новой строки
                currentLineIndex++;
            }

            const lexemStartInLine = lexemStart - currentLineStart;
            const lexemEndInLine = lexemEnd - currentLineStart;

            // Проверяем, не выходит ли лексема за пределы текущей строки
            if (lexemEndInLine <= this.lines[currentLineIndex].length) {
                // Лексемма полностью в одной строке
                const lexem = {
                    start: lexemStartInLine,
                    end: lexemEndInLine,
                    style: leaf.style,
                    leafIndex: leafIndex,
                };
                lexemsPerLine[currentLineIndex].push(lexem);
                this.lexemToLeaf.set(`${currentLineIndex}-${lexemsPerLine[currentLineIndex].length - 1}`, leaf);
                
                // Отладочный вывод для первой строки
                if (currentLineIndex === 0) {
                    console.log(`Added lexem to line 0:`, lexem, 'leaf text:', leafText);
                }
            } else {
                // Лексема пересекает несколько строк - разбиваем её
                let remainingStart = lexemStart;
                const remainingEnd = lexemEnd;
                let lineIdx = currentLineIndex;
                let lineStart = currentLineStart;

                while (remainingStart <= remainingEnd && lineIdx < this.lines.length) {
                    const lineEnd = lineStart + this.lines[lineIdx].length - 1;
                    const lexemStartInCurrentLine = remainingStart - lineStart;
                    const lexemEndInCurrentLine = Math.min(remainingEnd, lineEnd) - lineStart;

                    if (lexemStartInCurrentLine <= this.lines[lineIdx].length - 1) {
                        const lexem = {
                            start: lexemStartInCurrentLine,
                            end: lexemEndInCurrentLine,
                            style: leaf.style,
                            leafIndex: leafIndex,
                        };
                        lexemsPerLine[lineIdx].push(lexem);
                        this.lexemToLeaf.set(`${lineIdx}-${lexemsPerLine[lineIdx].length - 1}`, leaf);
                    }

                    remainingStart = lineStart + this.lines[lineIdx].length + 1;
                    lineStart += this.lines[lineIdx].length + 1;
                    lineIdx++;
                }
            }
            
            lexemStart = lexemEnd;
            leafIndex++;
        }

        return lexemsPerLine;
    }

    getHighlightetLineHTML(text, lineNumber) {
        const lexems = this.lexemsPerLine[lineNumber] || [];
        const container = document.createElement('div');
        container.style.display = 'inline';
        
        // Отладочный вывод
        if (lineNumber === 0) { // Выводим только для первой строки
            console.log(`getHighlightetLineHTML line ${lineNumber}: text="${text}", lexems=`, lexems);
        }
        
        // Если нет правил или лексем, просто отображаем текст
        if (!this.rules || this.rules.length === 0 || lexems.length === 0) {
            if (text.length === 0) {
                container.innerHTML = '&nbsp;';
            } else {
                container.textContent = text;
            }
            return { container: container, spans: [] };
        }

        // Создаем карту стилей из правил
        const styleMap = {};
        this.rules.forEach(rule => {
            styleMap[rule.Name] = rule.Style;
        });

        let lastPos = 0;
        const spans = [];

        lexems.forEach((lexem, lexemIndex) => {
            // Добавляем текст до токена
            if (lexem.start > lastPos) {
                const textNode = document.createTextNode(text.slice(lastPos, lexem.start));
                container.appendChild(textNode);
            }

            // Добавляем размеченный токен
            const lexemText = text.slice(lexem.start, lexem.end);
            const style = styleMap[lexem.style];

            const span = document.createElement('span');
            if (style) {
                span.style.color = style.Color;
                if (style.Bold) span.style.fontWeight = 'bold';
                if (style.Italic) span.style.fontStyle = 'italic';
            }

            span.textContent = lexemText;
            container.appendChild(span);
            spans.push(span);

            // Связываем span с листом только если есть lexemToLeaf
            if (this.lexemToLeaf) {
                const leaf = this.lexemToLeaf.get(`${lineNumber}-${lexemIndex}`);
                if (leaf) {
                    this.leafToSpan.set(leaf, span);
                    this.spanToLeaf.set(span, leaf);
                }
            }

            lastPos = lexem.end;
        });

        // Добавляем оставшийся текст
        if (lastPos < text.length) {
            const textNode = document.createTextNode(text.slice(lastPos));
            container.appendChild(textNode);
        }

        // Если строка пустая, добавляем неразрывный пробел
        if (text.length === 0) {
            container.innerHTML = '&nbsp;';
        }

        return { container: container, spans: spans };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML || '&nbsp;';
    }

    // Оптимизированный рендер с debouncing
    renderAllLexems() {
        console.log('renderAllLexems called, lexemsPerLine:', this.lexemsPerLine);
        
        if (this.lines.length === 0) {
            this.viewport.innerHTML = '';
            this.renderedLines.clear();
            this.returnAllElementsToPool();
            return;
        }

        const { startLine, endLine } = this.getVisibleRange();

        // Диапазон изменился - нужно обновить структуру
        this.updateVisibleRange(startLine, endLine);
        this.lastVisibleRange = { startLine, endLine };

        // Позиционируем viewport
        const translateY = `translateY(${startLine * this.options.lineHeight + this.options.padding}px)`;
        this.viewport.style.transform = translateY;
    }

    renderOnScroll() {
        if (this.lines.length === 0) {
            this.viewport.innerHTML = '';
            this.renderedLines.clear();
            this.returnAllElementsToPool();
            return;
        }

        const { startLine, endLine } = this.getVisibleRange();

        if (this.lastVisibleRange.startLine === startLine && this.lastVisibleRange.endLine === endLine) {
            return;
        }

        // Обновляем только изменившиеся строки
        for (let i = startLine; i <= endLine; i++) {
            const lineData = this.renderedLines.get(i);
            if (!lineData) {
                continue;
            }

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


        this.lastVisibleRange = { startLine, endLine };

        // Позиционируем viewport
        const translateY = `translateY(${startLine * this.options.lineHeight + this.options.padding}px)`;
        this.viewport.style.transform = translateY;
    }

    updateVisibleRange(startLine, endLine) {
        console.log(`updateVisibleRange: ${startLine} to ${endLine}`);
        
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
            if (this.renderedLines.has(i)) {
                this.renderedLines.get(i).element.remove();
                this.returnElementToPool(this.renderedLines.get(i).element);
                this.renderedLines.delete(i);
            }
            console.log(`Creating line element for line ${i}`);
            const lineElementData = this.createOptimizedLineElement(i);
            elementsToAdd.push({
                index: i,
                element: lineElementData.container,
                content: this.getLineContentHash(i),
                isCurrentLine: i === this.cursorLine,
                spans: lineElementData.spans,
            });

            fragment.appendChild(lineElementData.container);
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
                spans: item.spans,
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
        lineContentElement.style.color = '#d4d4d4'; // Явно устанавливаем цвет текста
        const {container, spans} = this.getHighlightetLineHTML(line, lineIndex);
        
        // Перемещаем все дочерние элементы из container в lineContentElement
        while (container.firstChild) {
            lineContentElement.appendChild(container.firstChild);
        }

        lineContainer.appendChild(lineNumberElement);
        lineContainer.appendChild(lineContentElement);

        return {container: lineContainer, spans: spans};
    }

    // Быстрый хэш для определения изменений содержимого строки
    getLineContentHash(lineIndex) {
        const line = this.lines[lineIndex] || '';
        const lexems = this.lexemsPerLine[lineIndex] || [];
        const isCurrentLine = lineIndex === this.cursorLine;

        // Простой хэш на основе содержимого и токенов
        return `${line.length}-${lexems.length}-${isCurrentLine}`;
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
            const {container, spans} = this.getHighlightetLineHTML(line, lineIndex);
            
            // Очищаем старое содержимое
            lineContentElement.innerHTML = '';
            
            // Перемещаем все дочерние элементы из container в lineContentElement
            while (container.firstChild) {
                lineContentElement.appendChild(container.firstChild);
            }
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
            this.renderAllLexems();
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
            this.renderAllLexems();
        } else {
            this.cursorLine = newCursorLine;
        }
    }

    handleLeafChange(leaf, changeType, args) {
        const span = this.leafToSpan.get(leaf);
        if (!span) {
            console.warn('handleLeafChange: не найден span для листа', leaf);
            return;
        }

        switch (changeType) {
            case 'newStyle': {
                // Изменился стиль листа - обновляем стиль span
                const style = args.newStyle;
                if (style && this.rules) {
                    const styleMap = {};
                    this.rules.forEach(rule => {
                        styleMap[rule.Name] = rule.Style;
                    });
                    
                    const styleObj = styleMap[style];
                    if (styleObj) {
                        span.style.color = styleObj.Color || '';
                        span.style.fontWeight = styleObj.Bold ? 'bold' : '';
                        span.style.fontStyle = styleObj.Italic ? 'italic' : '';
                    } else {
                        // Сбрасываем стили
                        span.style.color = '';
                        span.style.fontWeight = '';
                        span.style.fontStyle = '';
                    }
                }
                break;
            }
            
            case 'delete': {
                // Лист удален - удаляем span
                if (span.parentNode) {
                    span.remove();
                }
                this.leafToSpan.delete(leaf);
                this.spanToLeaf.delete(span);
                
                // Обновляем позиции листьев после удаления
                this.updateLeafPositions();
                break;
            }
            
            case 'replace': {
                // Лист заменен на несколько новых
                const newLeaves = args.newLeaves || [];
                const parentElement = span.parentNode;
                
                if (parentElement) {
                    // Создаем новые span элементы для новых листьев
                    const newSpans = [];
                    
                    newLeaves.forEach(newLeaf => {
                        const newSpan = document.createElement('span');
                        newSpan.textContent = newLeaf.getText();
                        
                        // Применяем стиль если есть
                        if (newLeaf.style && this.rules) {
                            const styleMap = {};
                            this.rules.forEach(rule => {
                                styleMap[rule.Name] = rule.Style;
                            });
                            
                            const styleObj = styleMap[newLeaf.style];
                            if (styleObj) {
                                newSpan.style.color = styleObj.Color || '';
                                newSpan.style.fontWeight = styleObj.Bold ? 'bold' : '';
                                newSpan.style.fontStyle = styleObj.Italic ? 'italic' : '';
                            }
                        }
                        
                        // Вставляем новый span перед старым
                        parentElement.insertBefore(newSpan, span);
                        newSpans.push(newSpan);
                        
                        // Создаем связи для нового листа
                        this.leafToSpan.set(newLeaf, newSpan);
                        this.spanToLeaf.set(newSpan, newLeaf);
                        
                        // Подписываемся на изменения нового листа
                        newLeaf.setOnChangeCallback((changeType, args) => {
                            this.handleLeafChange(newLeaf, changeType, args);
                        });
                    });
                    
                    // Удаляем старый span
                    span.remove();
                    this.leafToSpan.delete(leaf);
                    this.spanToLeaf.delete(span);
                    
                    // Обновляем позиции листьев после замены
                    this.updateLeafPositions();
                }
                break;
            }
            
            default:
                console.warn('handleLeafChange: неизвестный тип изменения', changeType);
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
        this.renderAllLexems();
    }
}

export { VirtualizedCodeEditor };
