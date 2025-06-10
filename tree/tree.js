import { highlightWord } from '../utils/highlight.js';

function buildA(mealy, string) {
    if (!string) {
    // Каждое состояние переходит в себя же
        return mealy.allStates;
    }

    if (string.length == 1) {
        return mealy.allStates.map(state => {
            const next = mealy.getNextState(state, string);

            return next !== null ? next : mealy.startState;
        });
    }

    const result = [];
    for (const state of mealy.allStates) {
        let currentState = state;

        for (const symbol of string) {
            currentState = mealy.getNextState(currentState, symbol);
            if (currentState === null) {
                currentState = mealy.startState;
                break;
            }
        }

        result.push(currentState);
    }

    return result;
}

function calculateA(mealy, a1, a2) {
    const result = [];

    for (let i = 0; i < a1.length; i++) {
        const finishState1 = a1[i];
        const finishState2 = a2[finishState1];

        if (finishState2 === mealy.startState) { // Нет перехода из finishState1 по строке 2, поэтому добавляем переход из mealy.startState
            result.push(a2[mealy.startState]);
        } else {
            result.push(finishState2);
        }
    }

    return result;
}

// Функция вычисляет массив фрагментов текста:
// - если text полностью принимается из startState, то в ответе пустой массив
// - если лишь некий префикс text принимается из startState, то в ответе будет массив из 2 и более элементов
// - если text вообще не принимается из startState, то в ответе будет массив из 1 и более элементов
function calculateFragments(mealy, text, startState) {
    if (!text) {
        return [];
    }

    // Сначала проверяем, принимается ли весь текст из startState
    let currentState = startState;
    let canAcceptAll = true;

    for (let i = 0; i < text.length; i++) {
        const symbol = text[i];
        const nextState = mealy.getNextState(currentState, symbol);
        if (nextState === null) {
            canAcceptAll = false;
            break;
        }
        currentState = nextState;
    }

    // Если весь текст принимается, возвращаем пустой массив
    if (canAcceptAll) {
        if (startState === mealy.startState) {
            return [{ start: 0, end: text.length }];
        }

        return [];
    }

    // Разбиваем текст на фрагменты
    const result = [];
    let i = 0;

    while (i < text.length) {
        const fragmentStart = i;
        let currentState = mealy.startState;
        let maxAcceptedLength = 0;

        // Находим максимальную длину префикса, который может быть принят
        let j = i;
        while (j < text.length) {
            const symbol = text[j];
            const nextState = mealy.getNextState(currentState, symbol);

            if (nextState === null) {
                break;
            }

            currentState = nextState;
            j++;
            maxAcceptedLength = j - i;
        }

        // Если смогли принять хотя бы один символ, добавляем фрагмент
        if (maxAcceptedLength > 0) {
            result.push({
                start: fragmentStart,
                end: fragmentStart + maxAcceptedLength,
            });
            i = fragmentStart + maxAcceptedLength;
        } else {
            // Не смогли принять ни одного символа - ищем последовательность неразобранных символов
            const unrecognizedStart = i;
            while (i < text.length) {
                // Проверяем, можем ли принять символ с начального состояния
                const symbol = text[i];
                const nextState = mealy.getNextState(mealy.startState, symbol);
                if (nextState !== null) {
                    // Нашли символ, который может быть началом новой лексемы - останавливаемся
                    break;
                }
                i++;
            }

            // Добавляем всю последовательность неразобранных символов как один фрагмент
            result.push({
                start: unrecognizedStart,
                end: i,
            });
        }
    }

    return result;
}

class Signal {
    constructor(style) {
        this.style = style;
    }

    equals(other) {
        if (!other) {
            return false;
        }
        return this.style === other.style;
    }

    toString() {
        return `Signal(style=${this.style})`;
    }
}

let lastLogCallee = null;
let logEnabled = false;

function setLogEnabled(enabled) {
    logEnabled = enabled;
}

class AbstractNode {
    constructor(mealy) {
        this.mealy = mealy;
        this.signal = null;
    }

    isCurrentSignalEqualTo(otherSignal) {
        if (this.signal === null && otherSignal === null) {
            return true;
        }

        if (this.signal === null || otherSignal === null) {
            return false;
        }

        return this.signal.equals(otherSignal);
    }

    log(message, ...args) {
        if (!logEnabled) {
            return;
        }

        const className = this.constructor.name;
        const stackTrace = (new Error()).stack.split('\n');
        let methodName = '';
        for (const line of stackTrace.slice(2)) {
            const match = line.match(/at \w+\.(\w+)/);
            if (match) {
                [, methodName] = match;
                break;
            }
        }

        const isLeafNode = className === 'LeafNode';

        const nodeType = highlightWord(className, isLeafNode ? 'green' : 'brown');
        const nodeText = highlightWord(this.getText(), 'white');
        let nodeDescPostfix = '';
        if (this.isPseudo) {
            nodeDescPostfix = `, ${highlightWord('pseudo', 'gray')}`;
        } else if (this.parent === null) {
            nodeDescPostfix = `, ${highlightWord('root', 'gray')}`;
        }

        const nodeDesc = `${nodeType}("${nodeText}"${nodeDescPostfix})`;
        const callee = `${nodeDesc} ${methodName}`;

        if (callee === lastLogCallee) {
            // Используем только видимые символы для подсчета длины

            // eslint-disable-next-line no-control-regex
            const strippedCallee = callee.replace(/\x1b\[\d+m/g, ''); // Удаляем ANSI escape sequences
            const offset = ' '.repeat(strippedCallee.length - 1);

            console.log(`${offset}└─ ${message}`, ...args);
        } else {
            const formattedMessage = message ? `: ${message}` : '';
            lastLogCallee = callee;

            console.log(`${callee}${formattedMessage}`, ...args);
        }
    }

    isLeaf() {
        throw Error('AbstractNode.isLeaf() не реализован');
    }

    getText() {
        throw Error('AbstractNode.getText() не реализован');
    }

    leaves() {
        throw Error('AbstractNode.leaves() не реализован');
    }
}

class InetrnalNode extends AbstractNode {
    constructor(mealy, left, right) {
        super(mealy);

        if (!left && !right) {
            throw Error('Попытка инициализировать внутренний узел без детей');
        }

        if (left) {
            left.parent = this;
        }

        if (right) {
            right.parent = this;
        }

        this.left = left;
        this.right = right;

        this.startState = left ? left.startState : right.startState;

        this.parent = null; // будет установлен в конструкторе InternalNode

        this.A = this.calculateA();
        this.signal = this.calculateSignal();
    }

    isLeaf() {
        return false;
    }

    getText() {
        let text = '';
        if (this.left) {
            text += this.left.getText();
        }

        if (this.right) {
            text += this.right.getText();
        }

        return text;
    }

    leaves(withPseudo = false) {
        let leaves = [];

        if (this.left) {
            leaves = leaves.concat(this.left.leaves(withPseudo));
        }

        if (this.right) {
            leaves = leaves.concat(this.right.leaves(withPseudo));
        }

        return leaves;
    }

    addChild(child) {
        this.log(`called on node "${this.getText()}" to insert child ("${child.getText()}")`);

        if (!child) {
            throw Error('insertChild вызван с null в качестве дочернего узла');
        }

        if (this.parent) {
            throw Error('Добавление ребенка доступна только для корня дерева');
        }

        const right = this.right;

        if (right.left) {
            throw Error('Добавление ребенка доступно только для пустого дерева');
        }

        child.parent = right;
        right.left = child;

        if (child.isLeaf()) {
            child.applyNewStartState(this.left.A[this.left.startState]);
        } else {
            right.replaceChild(child, child);
        }
    }

    replaceChild(oldChild, newChild) {
        this.log(`called on node "${this.getText()}" to replace ${oldChild === this.left ? 'left' : 'right'} child ("${oldChild.getText()}") with node "${newChild.getText()}"`);

        if (!newChild) {
            throw Error('replaceChild вызван с null в качестве нового дочернего узла');
        }

        if (oldChild.isPseudo) {
            throw Error('Замена псевдо-узла недоступна');
        }

        if (oldChild === this.left) {
            this.left = newChild;
            this.left.parent = this;

            if (this.right && this.right.signal) {
                this.left.applyStyleFromSignal(this.right.signal);
            }

            this.onChildChanged(this.left, oldChild.signal, oldChild.A);
            return;
        }

        if (oldChild === this.right) {
            this.right = newChild;
            this.right.parent = this;

            this.onChildChanged(this.right, oldChild.signal, oldChild.A);
            return;
        }

        throw Error('replaceChild вызван из узла, не являющегося дочерним');
    }

    deleteChild(child) {
        this.log(`called on node "${this.getText()}" to delete ${child === this.left ? 'left' : 'right'} child ("${child.getText()}")`);

        if (child.isPseudo) {
            throw Error('Удаление псевдо-узла недоступно');
        }

        if (!child) {
            throw Error('deleteChild вызван с null в качестве дочернего узла');
        }

        if (!this.parent) {
            throw Error('Невозможно удалить узел у корня дерева');
        }

        if (child === this.left) {
            const oldLeftStartState = this.left.startState;
            this.left = null;

            if (!this.right) {
                if (this.parent) {
                    this.parent.deleteChild(this);
                }

                return;
            }
            let remainingChild;
            if (this.right.isPseudo) {
                remainingChild = this.right;
            } else {
                this.left = this.right;
                this.right = null;

                remainingChild = this.left;
            }

            // Пересчитываем A и signal для нового состояния
            const oldA = this.A;
            const oldSignal = this.signal;
            this.A = this.calculateA();
            this.signal = this.calculateSignal();
            this.startState = remainingChild.startState;

            remainingChild.applyNewStartState(oldLeftStartState);

            // Уведомляем родителя об изменениях, чтобы он пересчитал состояния
            if (this.parent) {
                this.parent.onChildChanged(this, oldSignal, oldA);
            }
            return;
        }

        if (child === this.right) {
            this.right = null;

            if (!this.left) {
                if (this.parent) {
                    this.parent.deleteChild(this);
                }

                return;
            }

            const oldSignal = this.signal;
            this.signal = this.calculateSignal();

            const oldA = this.A;
            this.A = this.calculateA();

            this.parent.onChildChanged(this, oldSignal, oldA);

            return;
        }

        throw Error(`_deleteChild вызван из узла, не являющегося дочерним (попытка удалить узел "${child.getText()}")`);
    }

    // Функция для реакции на новый сигнал на раскраску, пришедший от родителя
    applyStyleFromSignal(newSignal) {
    // Правого узла нет
        if (!this.right) {
            // Левого узла тоже нет - делать нечего, выходим
            if (!this.left) {
                return;
            }
            // Левый узел - единственный
            this.left.applyStyleFromSignal(newSignal);
            return;
        }

        this.log(`calliing applyStyleFromSignal on right child (${this.right.getText()}) with ${highlightWord('SIGNAL', 'magenta')}=${newSignal}`);
        this.right.applyStyleFromSignal(newSignal);
        // Правый узел выдает сигнал - значит он является завершением
        // лексемы левого узла и началом той лексемы, для которой предназначен newSignal
        if (this.right.signal !== null) {
            this.log(`right child (${this.right.getText()}) has signal, skipping applyStyleFromSignal on left child ${this.left ? `(${this.left.getText()})` : '(null)'}`);
            return;
        }
        // Правый узел не выдает сигнал, значит newSignal предназначен
        // и для правого и для левого узла
        if (this.left) {
            this.log(`calling applyStyleFromSignal on left child (${this.left.getText()}) with ${highlightWord('SIGNAL', 'magenta')}=${newSignal}`);
            this.left.applyStyleFromSignal(newSignal);
        }
    }

    applyNewStartState(newStartState) {
        if (this.left) {
            this.left.applyNewStartState(newStartState);
        } else if (this.right) {
            this.right.applyNewStartState(newStartState);
        }
    }

    // Функция, вызываемая дочерним поддеревом при его изменении
    onChildChanged(child, childOldSignal, childOldA) {
        let logMessage = `called on node "${this.getText()}" by ${child === this.left ? 'left' : 'right'} child (`;
        if (this.left) {
            logMessage += `left=${this.left.isLeaf() ? 'LeafNode(' : 'InternalNode('}"${this.left.getText()}")`;
        }
        if (this.right) {
            logMessage += `${this.left ? ', ' : ''}right=${this.right.isLeaf() ? 'LeafNode(' : 'InternalNode('}"${this.right.getText()}")`;
        }
        logMessage += ') ';
        this.log(logMessage);

        if (child === this.left) {
            this.onLeftChildChanged(child, childOldA);
            return;
        }

        if (child === this.right) {
            this.onRightChildChanged(child, childOldSignal);
            return;
        }

        throw Error('onChildChanged вызван из узла, не являющегося дочерним');
    }

    onLeftChildChanged(child, childOldA) {
        const oldA = this.A;
        const oldSignal = this.signal;
        const oldStartState = this.startState;

        if (this.right && child.A[child.startState] !== this.right.startState) {
            this.log(`left child (${this.left.getText()}) changed ${highlightWord('FINISH_STATE', 'magenta')} (${childOldA[child.startState]} -> ${child.A[child.startState]})`);
            this.log(`calling applyNewStartState on right child (${this.right.getText()}) with new ${highlightWord('FINISH_STATE', 'magenta')} (${child.A[child.startState]})`);
            this.right.applyNewStartState(child.A[child.startState]);
        }

        this.A = this.calculateA();
        this.signal = this.calculateSignal();
        this.startState = this.left.startState;

        if (!this.parent) {
            return;
        }

        const startStateChanged = this.startState !== oldStartState;
        const finishStateChanged = this.A[this.startState] !== oldA[this.startState];
        const signalChanged = !this.isCurrentSignalEqualTo(oldSignal);

        // Изменилось стартовое состояние или финишное состояние или сигнал
        const mustCallParent = startStateChanged || finishStateChanged || signalChanged;

        if (!mustCallParent) {
            return;
        }

        let logMessage = `this node (${this.getText()}) changed `;
        if (finishStateChanged) {
            logMessage += `${highlightWord('FINISH_STATE', 'magenta')} (${oldA[this.startState]} -> ${this.A[this.startState]}) `;
        }
        if (signalChanged) {
            logMessage += `${highlightWord('SIGNAL', 'magenta')} (${oldSignal} -> ${this.signal}) `;
        }
        if (startStateChanged) {
            logMessage += `${highlightWord('START_STATE', 'magenta')} (${oldStartState} -> ${this.startState})`;
        }

        this.log(logMessage);
        this.log(`calling onChildChanged on parent (${this.parent.getText()})`);
        this.parent.onChildChanged(this, oldSignal, oldA);
    }

    onRightChildChanged(child, childOldSignal) {
        const oldA = this.A;
        const oldSignal = this.signal;

        this.A = this.calculateA();
        this.signal = this.calculateSignal();

        if (this.left) {
            const leftFinishState = this.left.A[this.left.startState];
            const mustReapplyRightStartState = leftFinishState !== child.startState;

            // Из-за того что узел, завершающий лексему, устанавливает свое стартовое состояние в стандартное и является при этом правым потомком,
            // то при изменении его текста может возникнуть ситуация, когда он станет продолжением лексемы левого ребенка
            if (mustReapplyRightStartState) {
                this.log(`right child (${this.right.getText()}) has different ${highlightWord('START_STATE', 'magenta')} (${child.startState}) from left child ${highlightWord('FINISH_STATE', 'magenta')} (${leftFinishState})`);
                this.log(`calling applyNewStartState on right child (${this.right.getText()}) with new ${highlightWord('START_STATE', 'magenta')} (${child.startState})`);
                this.right.applyNewStartState(leftFinishState);
            }

            if (child.signal) {
                this.log(`right child (${this.right.getText()}) changed SIGNAL (${childOldSignal} -> ${child.signal})`);
                this.log(`calling applyStyleFromSignal on left child (${this.left.getText()})`);
                this.left.applyStyleFromSignal(child.signal);
            }
        }

        if (!this.parent) {
            return;
        }

        const finishStateChanged = this.A[this.startState] !== oldA[this.startState];
        const signalChanged = !this.isCurrentSignalEqualTo(oldSignal);

        // Изменилось финишное состояние или сигнал
        const mustCallParent = finishStateChanged || signalChanged;

        if (!mustCallParent) {
            return;
        }

        let logMessage = `this node (${this.getText()}) changed `;
        if (finishStateChanged) {
            logMessage += `${highlightWord('FINISH_STATE', 'magenta')} (${oldA[this.startState]} -> ${this.A[this.startState]}) `;
        }

        if (signalChanged) {
            logMessage += `${highlightWord('SIGNAL', 'magenta')} (${oldSignal} -> ${this.signal})`;
        }

        this.log(logMessage);
        this.log(`calling onChildChanged on parent (${this.parent.getText()})`);
        this.parent.onChildChanged(this, oldSignal, oldA);
    }

    calculateA() {
        if (this.left && this.right) {
            return calculateA(this.mealy, this.left.A, this.right.A);
        }

        if (this.left) {
            return this.left.A;
        }

        if (this.right) {
            return this.right.A;
        }

        return buildA(this.mealy, null);
    }

    calculateSignal() {
        if (this.left && this.right) {
            return this.left.signal !== null ? this.left.signal : this.right.signal;
        }

        if (this.left) {
            return this.left.signal;
        }

        if (this.right) {
            return this.right.signal;
        }

        return null;
    }
}

class LeafNode extends AbstractNode {
    constructor(mealy, startState, text, isPseudo = false) {
        super(mealy);

        if (isPseudo && text) {
            throw Error('Попытка создать псевдо-узел end с не пустым текстом');
        }

        this.parent = null; // будет установлен в конструкторе InternalNode
        this.onChangeCallback = null; // callback для уведомления о изменениях
        this.signal = null;
        this.style = null;
        this.startState = startState;
        this.A = buildA(mealy, text);
        this.text = text;
        this.isPseudo = isPseudo;
    }

    setOnChangeCallback(cb) {
        if (this.isPseudo) {
            throw Error('Нельзя установить колбек на псевдо-лист');
        }

        if (cb) {
            this.onChangeCallback = cb;
        }
    }

    isLeaf() {
        return true;
    }

    getText() {
        if (this.isPseudo) {
            return '';
        }

        return this.text;
    }

    leaves(withPseudo = false) {
        if (this.isPseudo && !withPseudo) {
            return [];
        }

        return [this];
    }

    // Типы изменений:
    //   - newStyle - у листа обновился стиль
    //   - delete - лсит удален
    //   - replcae - лист заменен новым набором листьев
    onChange(changeType, args) {
        if (this.onChangeCallback) {
            this.onChangeCallback(changeType, args);
        }
    }

    applyStyleFromSignal(signal) {
        this.log(`new ${highlightWord('SIGNAL', 'magenta')}=${signal}`);

        this.style = signal.style;
        // Уведомляем подписчиков об изменении стиля узла
        this.onChange('newStyle', { newStyle: this.style });
    }

    applyNewStartState(newStartState) {
        this.log(`prevState=${this.startState} (accepts with style ${highlightWord(this.mealy.getStyle(this.startState), 'green')}), newState=${newStartState} (accepts with style ${highlightWord(this.mealy.getStyle(newStartState), 'green')})`);

        if (this.isPseudo) {
            const oldSignal = this.signal;
            this.signal = new Signal(this.mealy.getStyle(newStartState));
            this.startState = newStartState;

            this.log(`called parent.onChildChanged with ${highlightWord('SIGNAL', 'green')} (${oldSignal} -> ${this.signal})`);
            this.parent.onChildChanged(this, oldSignal, this.A);
            return;
        }

        const oldStartState = this.startState;
        const oldSignal = this.signal;

        const fragments = calculateFragments(this.mealy, this.text, newStartState);
        this.log('calculated fragments', fragments.map(f => this.text.slice(f.start, f.end)));

        if (fragments.length === 0) {
            this.startState = newStartState; // <- Поскольку фрагментов 0, значит весь text является продолжением лексемы с финишным состоянием newStartState, поэтому устанавливаем стартовое состояние в новое
            this.signal = null; // <- Поскольку фрагментов 0, значит весь text узла является одной лексемой, следовательно он не может отправлять сигнал на раскраску

            const startStateChanged = this.startState !== oldStartState;
            const finishStateChanged = this.A[this.startState] !== this.A[oldStartState];
            const signalChanged = oldSignal !== null;

            const mustCallParent = startStateChanged || finishStateChanged || signalChanged;

            if (!mustCallParent) {
                return;
            }

            this.log(`called parent.onChildChanged with ${highlightWord('FINISH_STATE', 'magenta')} (${this.A[oldStartState]} -> ${this.A[this.startState]}) and ${highlightWord('SIGNAL', 'magenta')} (${oldSignal} -> ${this.signal}) and ${highlightWord('START_STATE', 'magenta')} (${oldStartState} -> ${this.startState})`);
            this.parent.onChildChanged(this, oldSignal, this.A);

            return;
        }

        if (fragments.length === 1) {
            this.startState = this.mealy.startState; // Лист завершает предыдущую лексему, поэтому стартовое состояние устанавливаем в стандартное
            this.signal = new Signal(this.mealy.getStyle(newStartState)); // <- Поскольку лист завершает предыдущую лексему, то отправляем сигнал на раскраску предыдущего листа

            const startStateChanged = this.startState !== oldStartState;
            const finishStateChanged = this.A[this.startState] !== this.A[oldStartState];
            const signalChanged = !this.signal.equals(oldSignal);

            const mustCallParent = startStateChanged || finishStateChanged || signalChanged;

            if (!mustCallParent) {
                return;
            }

            this.log(`called parent.onChildChanged with ${highlightWord('FINISH_STATE', 'magenta')} (${this.A[oldStartState]} -> ${this.A[this.startState]}) and ${highlightWord('SIGNAL', 'magenta')} (${oldSignal} -> ${this.signal}) and ${highlightWord('START_STATE', 'magenta')} (${oldStartState} -> ${this.startState})`);
            this.parent.onChildChanged(this, oldSignal, this.A);

            return;
        }

        const { root, leaves } = buildRealTree(this.mealy, this.text, fragments, newStartState);
        this.parent.replaceChild(this, root);
        this.onChange('replace', { newLeaves: leaves });
    }

    // Функция, вызываемая при изменении текста в узле
    onTextChange(newString) {
        const oldText = this.text;
        this.text = newString;

        this.log(`text changed: "${oldText}" -> "${newString}"`);

        if (!newString) {
            this.log(`string is empty, self-deleting node (${this.getText()})`);
            this.onChange('delete');
            // Новая строка - пустая, следовательно в этом узле нет смысла, удаляем его
            this.parent.deleteChild(this);
            return;
        }

        const oldSignal = this.signal;
        const oldA = this.A;

        // Пересчитываем фрашменты (стили), на которые автомат мили "разбивает" newString
        const fragments = calculateFragments(this.mealy, newString, this.startState);
        this.log('calculated fragments', fragments.map(f => newString.slice(f.start, f.end)));

        if (fragments.length === 0) { // <- newString является полным продолжением лексемы предыдущего листа
            this.signal = null; // <- текущий лист перестает отправлять сигнал на раскраску
            this.A = buildA(this.mealy, newString);

            const finishStateChanged = this.A[this.startState] !== oldA[this.startState];
            const signalChanged = oldSignal !== null;

            const mustCallParent = finishStateChanged || signalChanged;

            if (!mustCallParent) {
                return;
            }

            this.log(`called parent.onChildChanged with ${highlightWord('FINISH_STATE', 'green')} (${oldA[this.startState]} -> ${this.A[this.startState]}) and ${highlightWord('SIGNAL', 'green')} (${oldSignal} -> ${this.signal})`);
            this.parent.onChildChanged(this, oldSignal, oldA);

            return;
        }

        if (fragments.length === 1) { // <- newString завершает предыдущую лексему и начинает новую
            this.startState = this.mealy.startState;
            this.signal = new Signal(this.mealy.getStyle(this.startState)); // <- сигнал на раскраску лексемы из предыдущего(-их) узла(-ов)
            this.A = buildA(this.mealy, newString);

            const finishStateChanged = this.A[this.startState] !== oldA[this.startState];
            const signalChanged = !this.signal.equals(oldSignal);

            const mustCallParent = finishStateChanged || signalChanged;

            if (!mustCallParent) {
                return;
            }

            this.log(`called parent.onChildChanged with ${highlightWord('FINISH_STATE', 'green')} (${oldA[this.startState]} -> ${this.A[this.startState]}) and ${highlightWord('SIGNAL', 'green')} (${oldSignal} -> ${this.signal})`);
            this.parent.onChildChanged(this, oldSignal, oldA);

            return;
        }

        const { root, leaves } = buildRealTree(this.mealy, newString, fragments, this.startState);
        this.parent.replaceChild(this, root);
        this.onChange('replace', { newLeaves: leaves });
    }
}

function buildTree(mealy, text) {
    const fragments = calculateFragments(mealy, text, mealy.startState);
    return buildTreeFromFragments(mealy, text, fragments);
}

function buildTreeFromFragments(mealy, text, fragments) {
    //       root
    //    /        \
    //  start       .
    //           /     \
    //       realTree  end

    const allLeaves = [
        new LeafNode(mealy, mealy.startState, null, true), // Псевдо-лист стартовый
        ...fragments.map(f => {
            return new LeafNode(mealy, mealy.startState, text.slice(f.start, f.end));
        }),
        new LeafNode(mealy, mealy.startState, null, true), // Псевдо-лист финишный
    ];

    if (allLeaves.length === 2) {
        const firstLeafFinishState = allLeaves[0].A[allLeaves[0].startState];

        const root = new InetrnalNode(
            mealy,
            allLeaves[0],
            new InetrnalNode(
                mealy,
                null,
                allLeaves[1],
            ),
        );

        allLeaves[1].applyNewStartState(firstLeafFinishState);

        return {
            root,
            leaves: [],
        };
    }

    const realLeaves = allLeaves.slice(1, -1);

    const realTreeRoot = buildTreeFromLeaves(mealy, realLeaves, 0, realLeaves.length - 1);

    // Создаем финишное дерево, инициализируя parent для fistLeaf и lastLeaf
    const root = new InetrnalNode(
        mealy,
        allLeaves[0],
        new InetrnalNode(
            mealy,
            realTreeRoot,
            allLeaves[allLeaves.length - 1],
        ),
    );

    // Инициализируем состояния, сигналы и стили для всех листов
    for (let i = 1; i < allLeaves.length; i++) {
        const prevLeaf = allLeaves[i - 1];
        const leaf = allLeaves[i];
        const newStartState = prevLeaf.A[prevLeaf.startState];

        leaf.log('calling applyNewStartState during tree initialization');
        leaf.applyNewStartState(newStartState);
    }

    return {
        root,
        leaves: realLeaves,
    };
}

function buildRealTree(mealy, text, fragments, startState) {
    const leaves = fragments.map(f => {
        return new LeafNode(mealy, mealy.startState, text.slice(f.start, f.end));
    });

    const root = buildTreeFromLeaves(mealy, leaves, 0, leaves.length - 1);
    if (root.isLeaf()) {
        return { root, leaves: [root] };
    }

    // Инициализируем состояния, сигналы и стили для всех листов
    for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        let newStartState = startState;

        if (i !== 0) {
            const prevLeaf = leaves[i - 1];
            newStartState = prevLeaf.A[prevLeaf.startState];
        }

        leaf.log('calling applyNewStartState during tree initialization');
        leaf.applyNewStartState(newStartState);
    }

    return { root, leaves };
}

function buildTreeFromLeaves(mealy, leaves, start, end) {
    if (start === end) {
        return leaves[start];
    }
    if (start > end) {
        return null;
    }

    const mid = Math.floor((start + end) / 2);

    return new InetrnalNode(
        mealy,
        buildTreeFromLeaves(mealy, leaves, start, mid),
        buildTreeFromLeaves(mealy, leaves, mid + 1, end),
    );
}

export {
    LeafNode,
    InetrnalNode,
    Signal,

    buildA,
    calculateA,
    buildTree,
    buildTreeFromFragments,
    buildRealTree,
    calculateFragments,

    setLogEnabled,
};
