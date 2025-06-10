import { buildRealTree, calculateFragments } from '../tree/tree.js';

/**
 * Класс для управления текстовым редактором
 */
export class Editor {
    constructor(editorElement, hiddenInputElement) {
        this.editor = editorElement;
        this.tree = null;
        this.mealy = null;

        // Debug panel elements
        this.debugPanel = document.getElementById('debug-panel');
        this.debugPanelToggle = document.getElementById('debug-panel-toggle');
        this.isDebugPanelOpen = false;

        // Критические стили для работы редактора
        this.fontSize = 14;
        this.lineHeight = 21; // 1.5 * fontSize
        this.fontFamily = '\'Consolas\', \'Monaco\', \'Courier New\', monospace';

        this.leafSpanMap = new WeakMap(); // Связь между листьями дерева и span элементами
        this.spanLeafMap = new WeakMap(); // Обратная связь
        this.spanPositionMap = new WeakMap(); // {span -> {start, end}} абсолютные позиции в тексте

        // Создаем contenteditable overlay для ввода текста
        this.inputOverlay = null;
        this.isComposing = false;
        this.lastText = '';

        // Применяем критические стили к редактору
        this.applyEditorStyles();

        // Создаем overlay для ввода
        this.createInputOverlay();

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
        this.editor.style.whiteSpace = 'pre-wrap';
        this.editor.style.wordWrap = 'break-word';
        this.editor.style.overflowWrap = 'break-word';
        this.editor.style.position = 'relative';
        this.editor.style.cursor = 'text';
    }

    /**
     * Создание contenteditable overlay для ввода текста
     */
    createInputOverlay() {
        this.inputOverlay = document.createElement('div');
        this.inputOverlay.spellcheck = false;
        this.inputOverlay.contentEditable = true;
        this.inputOverlay.className = 'input-overlay';
        this.inputOverlay.style.position = 'absolute';
        this.inputOverlay.style.top = '0';
        this.inputOverlay.style.left = '0';
        this.inputOverlay.style.width = '100%';
        this.inputOverlay.style.height = '100%';
        this.inputOverlay.style.color = 'transparent';
        this.inputOverlay.style.caretColor = 'white';
        this.inputOverlay.style.outline = 'none';
        this.inputOverlay.style.overflow = 'hidden';
        this.inputOverlay.style.whiteSpace = 'pre-wrap';
        this.inputOverlay.style.wordWrap = 'break-word';
        this.inputOverlay.style.fontFamily = this.fontFamily;
        this.inputOverlay.style.fontSize = `${this.fontSize}px`;
        this.inputOverlay.style.lineHeight = `${this.lineHeight}px`;
        this.inputOverlay.style.zIndex = '1';
        
        // Предотвращаем автоматическое форматирование
        this.inputOverlay.style.webkitUserModify = 'read-write-plaintext-only';
        
        // Добавляем overlay в редактор
        this.editor.appendChild(this.inputOverlay);
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

        // Синхронизируем текст с overlay
        this.syncOverlayText();

        this.updateDebugPanel();
        
        // Устанавливаем фокус на редактор
        this.inputOverlay.focus();
    }

    /**
     * Синхронизация текста между span'ами и overlay
     */
    syncOverlayText() {
        const text = this.getText();
        // Устанавливаем только текст, без HTML
        this.inputOverlay.textContent = text;
        this.lastText = text;
        
        // Возвращаем фокус на overlay если он был активен
        if (document.activeElement === this.editor || this.editor.contains(document.activeElement)) {
            this.inputOverlay.focus();
            // Устанавливаем курсор в конец
            const range = document.createRange();
            const selection = window.getSelection();
            if (this.inputOverlay.firstChild) {
                range.selectNodeContents(this.inputOverlay);
                range.collapse(false);
            } else {
                range.setStart(this.inputOverlay, 0);
                range.collapse(true);
            }
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Клик по редактору фокусирует overlay
        this.editor.addEventListener('click', (e) => {
            // Всегда фокусируем overlay при клике
            this.inputOverlay.focus();
            
            // Позиционируем курсор только если кликнули не по самому overlay
            if (e.target !== this.inputOverlay) {
                this.positionCursorAtClick(e);
            }
        });

        // Обработка изменений в contenteditable
        this.inputOverlay.addEventListener('beforeinput', (e) => {
            // Предотвращаем создание div'ов при Enter
            if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
                e.preventDefault();
                document.execCommand('insertText', false, '\n');
            }
        });

        // Обработка изменений в contenteditable
        this.inputOverlay.addEventListener('input', () => {
            if (!this.isComposing) {
                this.handleContentChange();
            }
        });

        // Обработка композиции (для поддержки IME)
        this.inputOverlay.addEventListener('compositionstart', () => {
            this.isComposing = true;
        });

        this.inputOverlay.addEventListener('compositionend', () => {
            this.isComposing = false;
            this.handleContentChange();
        });

        // Обработка специальных клавиш
        this.inputOverlay.addEventListener('keydown', (e) => {
            // Обрабатываем только специальные случаи
            if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '    ');
            }
        });

        // Предотвращаем вставку форматированного текста
        this.inputOverlay.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            document.execCommand('insertText', false, text);
        });

        // Debug panel toggle
        this.debugPanelToggle.addEventListener('click', () => {
            this.toggleDebugPanel();
        });
    }

    /**
     * Переключение состояния отладочной панели
     */
    toggleDebugPanel() {
        this.isDebugPanelOpen = !this.isDebugPanelOpen;
        if (!this.isDebugPanelOpen) {
            this.debugPanel.classList.add('collapsed');
            this.debugPanelToggle.classList.add('collapsed');
        } else {
            this.debugPanel.classList.remove('collapsed');
            this.debugPanelToggle.classList.remove('collapsed');
        }

        this.updateDebugPanel();
    }

    /**
     * Получение нормализованного текста из contenteditable
     */
    getNormalizedTextFromOverlay() {
        // Клонируем содержимое для обработки
        const clone = this.inputOverlay.cloneNode(true);
        
        // Заменяем все br на переводы строк
        const brs = clone.querySelectorAll('br');
        brs.forEach(br => {
            br.replaceWith('\n');
        });
        
        // Заменяем все div'ы на их содержимое с переводом строки
        const divs = clone.querySelectorAll('div');
        divs.forEach((div, index) => {
            // Первый div не нуждается в переводе строки перед ним
            const prefix = index > 0 || div.previousSibling ? '\n' : '';
            const textNode = document.createTextNode(prefix + div.textContent);
            div.replaceWith(textNode);
        });
        
        // Получаем итоговый текст
        return clone.textContent || '';
    }

    /**
     * Обработка изменений содержимого
     */
    handleContentChange() {
        // Получаем нормализованный текст из overlay
        const currentText = this.getNormalizedTextFromOverlay();
        const oldText = this.lastText;

        if (currentText === oldText) {
            console.log('no change');
            return;
        }

        // Сохраняем текущую позицию курсора
        let cursorPosition = 0;
        try {
            cursorPosition = this.getAbsoluteCaretPosition();
        } catch (e) {
            // Если не удалось получить позицию, устанавливаем в конец
            cursorPosition = currentText.length;
        }

        console.log('cursorPosition', cursorPosition);

        // Находим различия между старым и новым текстом
        const diff = this.findTextDifference(oldText, currentText);
        console.log('diff', diff);
        if (diff.type === 'insert') {
            this.handleTextInsertion(diff);
        } else if (diff.type === 'delete') {
            this.handleTextDeletion(diff);
        }

        this.lastText = currentText;
        
        // Восстанавливаем фокус после обновления DOM
        this.inputOverlay.focus();
        this.restoreCaretPosition(cursorPosition);
    }

    /**
     * Получение абсолютной позиции курсора в overlay
     */
    getAbsoluteCaretPosition() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return 0;
        
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(this.inputOverlay);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        
        // Получаем HTML содержимое до курсора
        const container = document.createElement('div');
        container.appendChild(preCaretRange.cloneContents());
        
        // Нормализуем его так же, как мы нормализуем весь текст
        const brs = container.querySelectorAll('br');
        brs.forEach(br => {
            br.replaceWith('\n');
        });
        
        const divs = container.querySelectorAll('div');
        divs.forEach((div, index) => {
            const prefix = index > 0 || div.previousSibling ? '\n' : '';
            const textNode = document.createTextNode(prefix + div.textContent);
            div.replaceWith(textNode);
        });
        
        return container.textContent.length;
    }

    /**
     * Восстановление позиции курсора после обновления DOM
     */
    restoreCaretPosition(position) {
        const textLength = this.inputOverlay.textContent.length;
        const safePosition = Math.min(position, textLength);
        
        const range = document.createRange();
        const selection = window.getSelection();
        
        // Если overlay пустой, создаем пустой текстовый узел
        if (!this.inputOverlay.firstChild) {
            this.inputOverlay.appendChild(document.createTextNode(''));
        }
        
        let currentPos = 0;
        let targetNode = null;
        let targetOffset = 0;
        
        // Находим нужный текстовый узел и смещение
        const walker = document.createTreeWalker(
            this.inputOverlay,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const nodeLength = node.textContent.length;
            
            if (currentPos + nodeLength >= safePosition) {
                targetNode = node;
                targetOffset = safePosition - currentPos;
                break;
            }
            
            currentPos += nodeLength;
        }
        
        if (targetNode) {
            range.setStart(targetNode, targetOffset);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        } else if (this.inputOverlay.firstChild) {
            // Если не нашли узел, ставим в конец первого узла
            range.setStart(this.inputOverlay.firstChild, this.inputOverlay.firstChild.textContent.length);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    getTextChangePosition(oldText, newText) {
        const minLen = Math.min(oldText.length, newText.length);
        let start = 0;

        // Находим начало изменения
        while (start < minLen && oldText[start] === newText[start]) {
            start++;
        }
        
        return start
    }

    /**
     * Поиск различий между текстами
     */
    findTextDifference(oldText, newText) {
        const minLen = Math.min(oldText.length, newText.length);
        let start = 0;
        let oldEnd = oldText.length;
        let newEnd = newText.length;

        // Находим начало изменения
        while (start < minLen && oldText[start] === newText[start]) {
            start++;
        }

        // Находим конец изменения
        while (oldEnd > start && newEnd > start && oldText[oldEnd - 1] === newText[newEnd - 1]) {
            oldEnd--;
            newEnd--;
        }

        if (oldEnd === start && newEnd > start) {
            // Вставка текста
            return {
                type: 'insert',
                position: start,
                text: newText.substring(start, newEnd)
            };
        } else if (newEnd === start && oldEnd > start) {
            // Удаление текста
            return {
                type: 'delete',
                position: start,
                length: oldEnd - start
            };
        } else {
            // Замена (рассматриваем как удаление + вставка)
            return {
                type: 'insert',
                position: start,
                text: newText.substring(start, newEnd),
                deleteLength: oldEnd - start
            };
        }
    }

    /**
     * Обработка вставки текста
     */
    handleTextInsertion(diff) {
        // Если есть удаление, сначала обрабатываем его
        if (diff.deleteLength) {
            this.handleTextDeletion({
                position: diff.position,
                length: diff.deleteLength
            });
        }

        const position = diff.position;
        const insertedText = diff.text;

        // Находим span в позиции вставки
        const targetInfo = this.getSpanInfoAtPosition(position);
        
        if (!targetInfo) {
            // Редактор пустой
            if (insertedText) {
                this.createNewTree(insertedText);
                // Не вызываем syncOverlayText здесь, так как он сбросит позицию курсора
                // Текст уже есть в overlay, просто обновляем lastText
                this.lastText = this.getNormalizedTextFromOverlay();
            }
            return;
        }

        const { span, offset } = targetInfo;
        const leaf = this.spanLeafMap.get(span);
        if (!leaf) return;

        // Обновляем текст в span
        const currentText = span.textContent;
        const newText = currentText.slice(0, offset) + insertedText + currentText.slice(offset);
        
        span.textContent = newText;
        leaf.onTextChange(newText);

        // Пересчитываем позиции span'ов
        this.updateSpanPositions();
        
        // Позиция курсора будет восстановлена в handleContentChange
    }

    /**
     * Обработка удаления текста
     */
    handleTextDeletion(diff) {
        const startPos = diff.position;
        const endPos = startPos + diff.length;

        // Находим все затронутые span'ы
        const affectedSpans = this.getSpansInRange(startPos, endPos);
        
        affectedSpans.forEach(({ span, startOffset, endOffset }) => {
            const leaf = this.spanLeafMap.get(span);
            if (!leaf) return;

            const currentText = span.textContent;
            const newText = currentText.slice(0, startOffset) + currentText.slice(endOffset);
            
            if (newText === '') {
                leaf.onTextChange('');
            } else {
                span.textContent = newText;
                leaf.onTextChange(newText);
            }
        });

        // Пересчитываем позиции span'ов
        this.updateSpanPositions();
        
        // Позиция курсора будет восстановлена в handleContentChange
    }

    /**
     * Позиционирование курсора при клике
     */
    positionCursorAtClick(event) {
        const clickX = event.clientX;
        const clickY = event.clientY;

        // Если кликнули по span'у, вычисляем позицию в тексте
        const clickedElement = document.elementFromPoint(clickX, clickY);
        
        if (clickedElement && clickedElement !== this.inputOverlay && clickedElement.nodeName === 'SPAN') {
            // Находим позицию span'а в общем тексте
            const spanInfo = this.spanPositionMap.get(clickedElement);
            if (spanInfo) {
                // Вычисляем примерную позицию внутри span'а
                const spanRect = clickedElement.getBoundingClientRect();
                const relativeX = clickX - spanRect.left;
                const charWidth = spanRect.width / clickedElement.textContent.length;
                const charIndex = Math.round(relativeX / charWidth);
                const position = spanInfo.start + Math.min(charIndex, clickedElement.textContent.length);
                
                // Устанавливаем курсор в вычисленную позицию
                setTimeout(() => {
                    this.inputOverlay.focus();
                    this.restoreCaretPosition(position);
                }, 0);
                
                return;
            }
        }

        // Используем стандартное позиционирование браузера
        let position = 0;
        
        if (document.caretPositionFromPoint) {
            const caret = document.caretPositionFromPoint(clickX, clickY);
            if (caret && caret.offsetNode === this.inputOverlay.firstChild) {
                position = caret.offset;
            }
        } else if (document.caretRangeFromPoint) {
            const range = document.caretRangeFromPoint(clickX, clickY);
            if (range && range.startContainer === this.inputOverlay.firstChild) {
                position = range.startOffset;
            }
        }

        this.restoreCaretPosition(position);
    }

    /**
     * Получение информации о span по позиции
     */
    getSpanInfoAtPosition(position) {
        const positionMap = this.spanPositionMap;
        
        for (const child of this.editor.children) {
            if (child.nodeName !== 'SPAN' || child === this.inputOverlay) continue;
            
            const spanInfo = positionMap.get(child);
            if (!spanInfo) continue;
            
            if (position >= spanInfo.start && position <= spanInfo.end) {
                return {
                    span: child,
                    offset: position - spanInfo.start
                };
            }
        }
        
        return null;
    }

    /**
     * Получение span'ов в диапазоне позиций
     */
    getSpansInRange(startPos, endPos) {
        const result = [];
        const positionMap = this.spanPositionMap;
        
        for (const child of this.editor.children) {
            if (child.nodeName !== 'SPAN' || child === this.inputOverlay) continue;
            
            const spanInfo = positionMap.get(child);
            if (!spanInfo) continue;
            
            // Проверяем пересечение диапазонов
            if (spanInfo.end > startPos && spanInfo.start < endPos) {
                result.push({
                    span: child,
                    startOffset: Math.max(0, startPos - spanInfo.start),
                    endOffset: Math.min(child.textContent.length, endPos - spanInfo.start)
                });
            }
        }
        
        return result;
    }

    /**
     * Обновление позиций span'ов
     */
    updateSpanPositions() {
        this.spanPositionMap = new WeakMap();
        let currentPos = 0;
        
        for (const child of this.editor.children) {
            if (child.nodeName !== 'SPAN' || child === this.inputOverlay) continue;
            
            const length = child.textContent.length;
            this.spanPositionMap.set(child, {
                start: currentPos,
                end: currentPos + length
            });
            
            currentPos += length;
        }
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

        this.updateDebugPanel();
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

        this.updateDebugPanel();
    }

    updateDebugPanel() {
        if (!this.isDebugPanelOpen) {
            this.debugPanel.innerHTML = '';
            return;
        }

        let debugContent = '';

        for (const leaf of this.tree.root.leaves(true)) {
            debugContent += `
                    <pre>${leaf.isPseudo ? 'pseudo' : `"${leaf.getText()}"`}: signal=${leaf.signal} style=${leaf.style}</pre>
            `;
        }

        this.debugPanel.innerHTML = debugContent;
    }

    /**
     * Обновление стиля листа
     */
    updateLeafStyle(leaf, newStyle) {
        const span = this.leafSpanMap.get(leaf);
        console.log('updateLeafStyle', leaf, newStyle, span);
        if (!span) {return;}

        const oldStyle = span.dataset.style;

        const oldTokenClass = this.getTokenClass(oldStyle);
        const newTokenClass = this.getTokenClass(newStyle);

        if (oldStyle !== newStyle) {
            span.classList.remove(oldTokenClass);
            span.classList.add(newTokenClass);
            span.dataset.style = newStyle;
        }
    }

    /**
     * Удаление листа
     */
    removeLeaf(leaf) {
        const span = this.leafSpanMap.get(leaf);
        if (!span) {return;}

        // Удаляем span из DOM
        span.remove();

        // Удаляем связи
        this.leafSpanMap.delete(leaf);
        this.spanLeafMap.delete(span);

        // Пересчитываем позиции
        this.updateSpanPositions();

        // Если редактор стал пустым, показываем заглушку
        if (this.editor.querySelectorAll('span:not(.input-overlay)').length === 0) {
            this.renderEmpty();
        }
        
        // Синхронизируем текст с overlay
        this.syncOverlayText();
    }

    /**
     * Замена листа новыми листьями
     */
    replaceLeaf(oldLeaf, newLeaves) {
        const oldSpan = this.leafSpanMap.get(oldLeaf);
        if (!oldSpan) {return;}

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

        // Пересчитываем позиции
        this.updateSpanPositions();
        
        // Синхронизируем текст с overlay
        this.syncOverlayText();
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
            'Constant': 'token-constant',
            'DefaultClass': 'token-default-class',
        };

        return styleMap[style] || null;
    }

    /**
     * Отрисовка листьев в редакторе
     */
    renderLeaves(leaves) {
        // Сохраняем overlay
        const overlay = this.inputOverlay;
        
        // Очищаем редактор
        this.editor.innerHTML = '';

        // Создаем span для каждого листа
        leaves.forEach(leaf => {
            const span = this.createSpanForLeaf(leaf);
            this.editor.appendChild(span);
        });

        // Возвращаем overlay
        this.editor.appendChild(overlay);

        // Пересчитываем позиции
        this.updateSpanPositions();
        
        // Синхронизируем текст с overlay
        this.syncOverlayText();
    }

    /**
     * Отрисовка пустого редактора
     */
    renderEmpty() {
        // Сохраняем overlay
        const overlay = this.inputOverlay;
        
        // Очищаем редактор
        this.editor.innerHTML = '';
        
        // Возвращаем overlay
        this.editor.appendChild(overlay);
        
        // Очищаем текст в overlay
        this.inputOverlay.textContent = '';
        this.lastText = '';
        
        // Очищаем позиции
        this.spanPositionMap = new WeakMap();
    }

    /**
     * Получение текста из редактора
     */
    getText() {
        const spans = Array.from(this.editor.children)
            .filter(el => el.nodeName === 'SPAN' && el !== this.inputOverlay);
        
        return spans.map(el => el.textContent).join('');
    }

    /**
     * Установка текста в редактор
     */
    setText(text) {
        // Очищаем редактор
        this.editor.innerHTML = '';
        
        // Возвращаем overlay
        this.editor.appendChild(this.inputOverlay);

        if (!text) {
            this.renderEmpty();
            return;
        }

        // Создаем новое дерево
        this.createNewTree(text);
    }
}
