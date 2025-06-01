import { buildRealTree, calculateFragments } from '../tree/tree.js';

/**
 * Класс для управления текстовым редактором
 */
export class Editor {
    constructor(editorElement, hiddenInputElement) {
        this.editor = editorElement;
        this.hiddenInput = hiddenInputElement;
        this.tree = null;
        this.mealy = null;

        // Критические стили для работы редактора
        this.fontSize = 14;
        this.lineHeight = 21; // 1.5 * fontSize
        this.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace";
        this.charWidth = null; // Ширина символа для моноширинного шрифта

        this.cursorPosition = 0;
        this.cursorLine = 0;
        
        this.leafSpanMap = new WeakMap(); // Связь между листьями дерева и span элементами
        this.spanLeafMap = new WeakMap(); // Обратная связь
        this.spanCoordinatsMap = new WeakMap(); // {span -> {line, startOffset, endOffset}}
        this.coordinatesToSpanMap = new Map(); // "line:offset" -> span

        // Применяем критические стили к редактору
        this.applyEditorStyles();

        // Вычисляем ширину символа для моноширинного шрифта
        this.calculateCharWidth();

        this.setupEventListeners();
    }

    /**
     * Применение критических стилей к редактору
     */
    applyEditorStyles() {
        // Устанавливаем моноширинный шрифт и размеры
        this.editor.style.fontFamily = this.fontFamily;
        this.editor.style.fontSize = `${this.fontSize}px`;
        this.editor.style.lineHeight = `${this.lineHeight}px`;
        
        // Важные стили для корректной работы
        this.editor.style.whiteSpace = 'pre';
        this.editor.style.wordWrap = 'normal';
        this.editor.style.overflowWrap = 'normal';
        
        // Стили для скрытого input
        this.hiddenInput.style.position = 'absolute';
        this.hiddenInput.style.left = '-9999px';
        this.hiddenInput.style.width = '0';
        this.hiddenInput.style.height = '0';
        this.hiddenInput.style.opacity = '0';
    }

    /**
     * Вычисление ширины символа для моноширинного шрифта
     */
    calculateCharWidth() {
        const measurer = document.createElement('span');
        measurer.style.visibility = 'hidden';
        measurer.style.position = 'absolute';
        measurer.style.fontFamily = this.fontFamily;
        measurer.style.fontSize = `${this.fontSize}px`;
        measurer.style.lineHeight = `${this.lineHeight}px`;
        measurer.style.whiteSpace = 'pre';
        measurer.textContent = 'X'; // Любой символ для моноширинного шрифта

        this.editor.appendChild(measurer);
        this.charWidth = measurer.offsetWidth;
        this.editor.removeChild(measurer);
    }

    /**
     * Инициализация редактора с автоматом Мили и деревом
     */
    init(mealy, tree) {
        this.mealy = mealy;
        this.tree = tree;

        // Если дерево содержит реальные листья, отрисовываем их
        const leaves = tree.leaves;
        if (leaves.length > 0) {
            this.renderLeaves(leaves);
        } else {
            // Пустой редактор
            this.renderEmpty();
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Клик по редактору фокусирует скрытый input
        this.editor.addEventListener('click', (e) => {
            this.hiddenInput.focus();
            this.updateCursorPosition(e);
        });

        // Обработка ввода текста
        this.hiddenInput.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
            e.target.value = '';
        });

        // Обработка клавиш
        this.hiddenInput.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // Обработка выделения текста
        document.addEventListener('selectionchange', () => {
            this.handleSelectionChange();
        });
    }

    /**
     * Обработка ввода текста
     */
    handleInput(inputValue) {
        if (!inputValue) return;

        // Находим текущий span по позиции курсора
        const targetSpan = this.getSpanAtPosition(this.cursorPosition);
        console.log('handleInput', inputValue, targetSpan);

        if (!targetSpan) {
            // Редактор пустой, нужно создать новое дерево
            this.createNewTree(inputValue);
            return;
        }

        // Получаем лист, связанный со span'ом
        const leaf = this.spanLeafMap.get(targetSpan);
        if (!leaf) return;

        console.log('leaf', leaf);

        // Определяем позицию внутри span'а
        const spanOffset = this.getOffsetInSpan(targetSpan, this.cursorPosition);

        console.log('spanOffset', spanOffset);

        // Вставляем текст в нужную позицию
        const currentText = targetSpan.textContent;
        const newText = currentText.slice(0, spanOffset) + inputValue + currentText.slice(spanOffset);

        targetSpan.textContent = newText;

        console.log('newText', newText);

        // Обновляем текст в листе
        leaf.onTextChange(newText);

        // Обновляем позицию курсора
        this.cursorPosition += inputValue.length;

        // Пересчитываем карты координат после изменения
        this.rebuildCoordinateMaps();

        // Обновляем отображение курсора
        const { line, column } = this.getLineAndColumnFromPosition(this.cursorPosition);
        this.cursorLine = line;
        this.updateCursorDisplay();
    }

    /**
     * Обработка нажатия клавиш
     */
    handleKeyDown(event) {
        switch (event.key) {
            case 'Backspace':
                event.preventDefault();
                this.handleBackspace();
                break;
            case 'Delete':
                event.preventDefault();
                this.handleDelete();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.moveCursor(-1);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.moveCursor(1);
                break;
            case 'Enter':
                event.preventDefault();
                this.handleInput('\n');
                break;
        }
    }

    /**
     * Обработка удаления символа перед курсором
     */
    handleBackspace() {
        if (this.cursorPosition === 0) return;

        const targetSpan = this.getSpanAtPosition(this.cursorPosition);
        if (!targetSpan) return;

        const leaf = this.spanLeafMap.get(targetSpan);
        if (!leaf) return;

        console.log('handleBackspace', targetSpan, leaf);

        const spanOffset = this.getOffsetInSpan(targetSpan, this.cursorPosition - 1);
        const currentText = targetSpan.textContent;

        if (currentText.length === 1) {
            // Если в span'е остался только один символ, он будет удален
            leaf.onTextChange('');
        } else {
            // Удаляем символ из текста
            const newText = currentText.slice(0, spanOffset) + currentText.slice(spanOffset + 1);
            targetSpan.textContent = newText;
            leaf.onTextChange(newText);
        }

        this.cursorPosition--;

        // Пересчитываем карты координат после изменения
        this.rebuildCoordinateMaps();

        // Обновляем отображение курсора
        const { line, column } = this.getLineAndColumnFromPosition(this.cursorPosition);
        this.cursorLine = line;
        this.updateCursorDisplay();
    }

    /**
     * Обработка удаления символа после курсора
     */
    handleDelete() {
        const targetSpan = this.getSpanAtPosition(this.cursorPosition + 1);
        if (!targetSpan) return;

        const leaf = this.spanLeafMap.get(targetSpan);
        if (!leaf) return;

        const spanOffset = this.getOffsetInSpan(targetSpan, this.cursorPosition);
        const currentText = targetSpan.textContent;

        if (spanOffset >= currentText.length) return;

        if (currentText.length === 1) {
            // Если в span'е остался только один символ, он будет удален
            leaf.onTextChange('');
        } else {
            // Удаляем символ из текста
            const newText = currentText.slice(0, spanOffset) + currentText.slice(spanOffset + 1);
            targetSpan.textContent = newText;
            leaf.onTextChange(newText);
        }

        // Пересчитываем карты координат после изменения
        this.rebuildCoordinateMaps();

        // Обновляем отображение курсора
        const { line, column } = this.getLineAndColumnFromPosition(this.cursorPosition);
        this.cursorLine = line;
        this.updateCursorDisplay();
    }

    /**
     * Создание нового дерева для пустого редактора
     */
    createNewTree(text) {
        const fragments = calculateFragments(this.mealy, text, this.mealy.startState);

        const { root, leaves } = buildRealTree(this.mealy, text, fragments, this.mealy.startState);

        // Добавляем новое дерево к корню
        this.tree.root.addChild(root);

        // Устанавливаем обработчики для новых листьев
        this.setupLeaves(leaves);

        // Отрисовываем листья
        this.renderLeaves(leaves);

        // Устанавливаем курсор в конец
        this.cursorPosition = text.length;
        const { line, column } = this.getLineAndColumnFromPosition(this.cursorPosition);
        this.cursorLine = line;
        this.updateCursorDisplay();
    }

    /**
     * Настройка обработчиков для листьев
     */
    setupLeaves(leaves) {
        leaves.forEach(leaf => {
            leaf.setOnChangeCallback((changeType, args) => {
                this.handleLeafChange(leaf, changeType, args);
            });
        });
    }

    /**
     * Обработка изменений в листе
     */
    handleLeafChange(leaf, changeType, args) {
        console.log('handleLeafChange', leaf, changeType, args);
        switch (changeType) {
            case 'newStyle':
                this.updateLeafStyle(leaf, args.newStyle);
                break;
            case 'delete':
                this.removeLeaf(leaf);
                break;
            case 'replace':
                this.replaceLeaf(leaf, args.newLeaves);
                break;
        }
    }

    /**
     * Обновление стиля листа
     */
    updateLeafStyle(leaf, newStyle) {
        const span = this.leafSpanMap.get(leaf);
        console.log('updateLeafStyle', leaf, newStyle, span);
        if (!span) return;

        const oldStyle = span.dataset.style;

        const oldTokenClass = this.getTokenClass(oldStyle);
        const newTokenClass = this.getTokenClass(newStyle);

        if (oldStyle !== newStyle) {
            span.classList.remove(oldTokenClass)
            span.classList.add(newTokenClass)
            span.dataset.style = newStyle;
        }
    }

    /**
     * Удаление листа
     */
    removeLeaf(leaf) {
        const span = this.leafSpanMap.get(leaf);
        if (!span) return;

        // Удаляем span из DOM
        span.remove();

        // Удаляем связи
        this.leafSpanMap.delete(leaf);
        this.spanLeafMap.delete(span);

        // Пересчитываем карты координат
        this.rebuildCoordinateMaps();

        // Если редактор стал пустым, показываем заглушку
        if (this.editor.children.length === 0) {
            this.renderEmpty();
        } else {
            this.updateCursorDisplay();
        }
    }

    /**
     * Замена листа новыми листьями
     */
    replaceLeaf(oldLeaf, newLeaves) {
        const oldSpan = this.leafSpanMap.get(oldLeaf);
        if (!oldSpan) return;

        // Создаем новые span'ы для новых листьев
        const newSpans = newLeaves.map(leaf => this.createSpanForLeaf(leaf));

        // Вставляем новые span'ы перед старым
        newSpans.forEach(span => {
            oldSpan.parentNode.insertBefore(span, oldSpan);
        });

        // Удаляем старый span
        oldSpan.remove();

        // Удаляем старые связи
        this.leafSpanMap.delete(oldLeaf);
        this.spanLeafMap.delete(oldSpan);

        // Настраиваем обработчики для новых листьев
        this.setupLeaves(newLeaves);

        // Пересчитываем карты координат
        this.rebuildCoordinateMaps();

        // Обновляем отображение курсора
        this.updateCursorDisplay();
    }

    /**
     * Создание span элемента для листа
     */
    createSpanForLeaf(leaf) {
        const span = document.createElement('span');
        span.textContent = leaf.getText();

        span.dataset.style = leaf.style;

        // Устанавливаем стиль, если есть
        if (leaf.style) {
            span.className = this.getTokenClass(leaf.style);
        }

        // Создаем двустороннюю связь
        this.leafSpanMap.set(leaf, span);
        this.spanLeafMap.set(span, leaf);

        return span;
    }

    /**
     * Получение CSS класса для стиля токена
     */
    getTokenClass(style) {
        // Маппинг стилей на CSS классы
        const styleMap = {
            'Keyword': 'token-keyword',
            'Identifier': 'token-identifier',
            'Number': 'token-number',
            'String': 'token-string',
            'SingleLineComment': 'token-comment',
            'MultiLineComment': 'token-comment',
            'Operator': 'token-operator',
            'Punctuation': 'token-punctuation',
            'Type': 'token-type',
            'Function': 'token-function',
            'Preprocessor': 'token-preprocessor',
            'Annotation': 'token-annotation',
            'Character': 'token-character',
            'Constant': 'token-constant'
        };

        return styleMap[style] || null;
    }

    /**
     * Отрисовка листьев в редакторе
     */
    renderLeaves(leaves) {
        // Очищаем редактор
        this.editor.innerHTML = '';

        // Создаем span для каждого листа
        leaves.forEach(leaf => {
            const span = this.createSpanForLeaf(leaf);
            this.editor.appendChild(span);
        });

        // Пересчитываем карты координат
        this.rebuildCoordinateMaps();

        // Обновляем отображение курсора
        this.updateCursorDisplay();
    }

    /**
     * Отрисовка пустого редактора
     */
    renderEmpty() {
        this.editor.innerHTML = '';
        this.cursorPosition = 0;
        this.cursorLine = 0;
        this.rebuildCoordinateMaps();
        this.updateCursorDisplay();
    }

    /**
     * Получение span'а по позиции в тексте
     */
    getSpanAtPosition(position) {
        let currentPos = 0;

        for (const span of this.editor.children) {
            if (span.nodeName !== 'SPAN') continue;
            const spanLength = span.textContent.length;
            if (position >= currentPos && position <= currentPos + spanLength) {
                return span;
            }
            currentPos += spanLength;
        }

        return null;
    }

    /**
     * Получение смещения внутри span'а
     */
    getOffsetInSpan(span, position) {
        let currentPos = 0;

        for (const child of this.editor.children) {
            if (child === span) {
                return position - currentPos;
            }
            currentPos += child.textContent.length;
        }

        return 0;
    }

    /**
     * Перемещение курсора
     */
    moveCursor(delta) {
        const totalLength = this.getTotalTextLength();
        this.cursorPosition = Math.max(0, Math.min(this.cursorPosition + delta, totalLength));
        
        const { line, column } = this.getLineAndColumnFromPosition(this.cursorPosition);
        this.cursorLine = line;
        
        this.updateCursorDisplay();
    }

    /**
     * Получение общей длины текста
     */
    getTotalTextLength() {
        return Array.from(this.editor.children).reduce((sum, span) => sum + span.textContent.length, 0);
    }

    /**
     * Обновление позиции курсора при клике
     */
    updateCursorPosition(event) {
        // Находим span, на который был произведен клик
        const clickedSpan = event.target.closest('span');
        if (!clickedSpan || !this.spanCoordinatsMap.has(clickedSpan)) {
            // Клик вне текста - ставим курсор в конец
            this.cursorPosition = this.getTotalTextLength();
            const { line, column } = this.getLineAndColumnFromPosition(this.cursorPosition);
            this.cursorLine = line;
            this.updateCursorDisplay();
            return;
        }

        // Получаем координаты span'а
        const coords = this.spanCoordinatsMap.get(clickedSpan);
        
        // Получаем координаты клика относительно редактора
        const editorRect = this.editor.getBoundingClientRect();
        const clickX = event.clientX - editorRect.left;
        const clickY = event.clientY - editorRect.top;

        // Вычисляем строку по Y координате
        const clickedLine = Math.floor(clickY / this.lineHeight);
        
        // Вычисляем позицию в строке по X координате
        const clickedColumn = Math.round(clickX / this.charWidth);

        // Находим абсолютную позицию в тексте
        let position = 0;
        let currentLine = 0;
        let currentColumn = 0;

        for (const span of this.editor.children) {
            if (span.nodeName !== 'SPAN') continue;

            const text = span.textContent;
            for (let i = 0; i < text.length; i++) {
                if (currentLine === clickedLine && currentColumn === clickedColumn) {
                    this.cursorPosition = position;
                    this.cursorLine = clickedLine;
                    this.updateCursorDisplay();
                    return;
                }

                if (text[i] === '\n') {
                    currentLine++;
                    currentColumn = 0;
                } else {
                    currentColumn++;
                }
                position++;
            }

            // Если мы достигли нужной строки, но колонка больше длины строки
            if (currentLine === clickedLine) {
                this.cursorPosition = position;
                this.cursorLine = clickedLine;
                this.updateCursorDisplay();
                return;
            }
        }

        // Если не нашли точную позицию, ставим в конец
        this.cursorPosition = this.getTotalTextLength();
        const { line, column } = this.getLineAndColumnFromPosition(this.cursorPosition);
        this.cursorLine = line;
        this.updateCursorDisplay();
    }

    /**
     * Обновление отображения курсора
     */
    updateCursorDisplay() {
        let cursor = this.editor.querySelector('.editor-cursor');
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.className = 'editor-cursor';
            cursor.style.position = 'absolute';
            cursor.style.height = `${this.lineHeight}px`;
            cursor.style.width = '2px';
            cursor.style.backgroundColor = 'white';
            this.editor.appendChild(cursor);
        }

        // Получаем позицию курсора в строке
        const { line, column } = this.getLineAndColumnFromPosition(this.cursorPosition);
        this.cursorLine = line;

        // Вычисляем координаты курсора
        const x = column * this.charWidth;
        const y = line * this.lineHeight;

        // Позиционируем курсор
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
    }

    /**
     * Обработка изменения выделения
     */
    handleSelectionChange() {
        // Пока не реализовано
    }

    /**
     * Установка текста в редактор
     */
    setText(text) {
        // Очищаем редактор
        this.editor.innerHTML = '';
        this.cursorPosition = 0;
        this.cursorLine = 0;

        if (!text) {
            this.renderEmpty();
            return;
        }

        // Создаем новое дерево
        this.createNewTree(text);
    }

    /**
     * Получение текста из редактора
     */
    getText() {
        return Array.from(this.editor.children)
            .filter(el => el.nodeName === 'SPAN')
            .map(el => el.textContent)
            .join('');
    }

    /**
     * Пересчет карт координат для всех span'ов
     */
    rebuildCoordinateMaps() {
        this.spanCoordinatsMap = new WeakMap();
        this.coordinatesToSpanMap.clear();

        let currentLine = 0;
        let currentOffset = 0;

        for (const span of this.editor.children) {
            if (span.nodeName !== 'SPAN') continue;

            const text = span.textContent;
            const startOffset = currentOffset;
            
            // Считаем количество переносов строк в тексте
            let lineBreaks = 0;
            for (let i = 0; i < text.length; i++) {
                if (text[i] === '\n') {
                    lineBreaks++;
                }
            }

            const endOffset = currentOffset + text.length;

            // Сохраняем информацию о координатах span'а
            this.spanCoordinatsMap.set(span, {
                line: currentLine,
                startOffset: startOffset,
                endOffset: endOffset
            });

            // Для каждой позиции в span'е добавляем запись в карту
            for (let i = startOffset; i < endOffset; i++) {
                this.coordinatesToSpanMap.set(`${currentLine}:${i}`, span);
            }

            currentOffset = endOffset;
            currentLine += lineBreaks;
        }
    }

    /**
     * Получение строки и позиции в строке по абсолютной позиции
     */
    getLineAndColumnFromPosition(position) {
        let line = 0;
        let column = 0;
        let currentPos = 0;

        for (const span of this.editor.children) {
            if (span.nodeName !== 'SPAN') continue;

            const text = span.textContent;
            
            for (let i = 0; i < text.length; i++) {
                if (currentPos === position) {
                    return { line, column };
                }

                if (text[i] === '\n') {
                    line++;
                    column = 0;
                } else {
                    column++;
                }
                currentPos++;
            }
        }

        return { line, column };
    }
} 