/**
 * Построение НКА (недетерминированного конечного автомата) по регулярному выражению
 * Алгоритм Томпсона (Thompson's construction)
 * 
 * Поддерживаемые операции:
 * - Основные: |, (), *, +, ?
 * - Множества: [A-Z], [^0-9], [A-Za-z_0-9]
 * - Классы: \d, \w, ., \s
 * 
 * Что не поддерживается:
 * - Пустые группы ()
 * - Пустые альтернативы (a|)

 */

import { UNICODE_CHARS } from './unicode.js';

/**
 * Класс для представления НКА
 */
class NFA {
    constructor() {
        this.states = [];                    // массив состояний
        this.transitions = {};               // {state: {symbol: [state1, state2, ...]}}
        this.epsilonTransitions = {};        // {state: [state1, state2, ...]}
        this.startState = null;
        this.acceptStates = {};              // {state: {priority, style}}
        this.stateCounter = 0;
    }

    static fromRegex(regex, style) {
        const parser = new RegexParser(regex);
        const nfa = parser.parse();

        for (const acceptState of Object.keys(nfa.acceptStates)) {
            nfa.acceptStates[acceptState] = { style, priority: 0 };
        }

        return nfa;
    }

    /**
     * Объединение с другими НКА
     */
    static union(nfas) {
        if (!Array.isArray(nfas)) {
            nfas = [nfas]
        }

        if (nfas.length === 0) {
            throw new Error('Массив НКА не может быть пустым');
        }

        // Создаем новый результирующий НКА
        const result = new NFA();

        // Создаем новое начальное состояние
        const newStart = result.createState();
        result.setStartState(newStart);

        // Копируем каждый НКА в результирующий НКА и создаем ε-переходы
        for (let i = 0; i < nfas.length; i++) {
            const nfa = nfas[i];
            const stateMap = nfa.copyToAnother(result);

            // ε-переход от нового начального состояния к началу этого НКА
            result.addEpsilonTransition(newStart, stateMap[nfa.startState]);

            // Добавляем принимающие состояния этого НКА
            for (const acceptState of Object.keys(nfa.acceptStates)) {
                const mappedAcceptState = stateMap[acceptState];
                const styleInfo = nfa.acceptStates[acceptState];

                result.acceptStates[mappedAcceptState] = {
                    style: styleInfo.style,
                    priority: i  // приоритет = порядок в массиве (меньше = выше приоритет)
                };
            }
        }

        return result;
    }

    /**
     * Создание нового состояния
     */
    createState() {
        const state = `q${this.stateCounter++}`;
        this.states.push(state);
        return state;
    }

    /**
     * Добавление перехода по символу
     */
    addTransition(fromState, symbol, toState) {
        if (!this.transitions[fromState]) {
            this.transitions[fromState] = {};
        }
        if (!this.transitions[fromState][symbol]) {
            this.transitions[fromState][symbol] = [];
        }
        this.transitions[fromState][symbol].push(toState);
    }

    /**
     * Добавление ε-перехода
     */
    addEpsilonTransition(fromState, toState) {
        if (!this.epsilonTransitions[fromState]) {
            this.epsilonTransitions[fromState] = [];
        }
        this.epsilonTransitions[fromState].push(toState);
    }

    /**
     * Установка начального состояния
     */
    setStartState(state) {
        this.startState = state;
    }

    /**
     * Добавление принимающего состояния
     */
    addAcceptState(state, style, priority = 0) {
        this.acceptStates[state] = { style, priority };
    }

    /**
     * Конкатенация с другим НКА
     */
    concatenate(other) {
        const result = new NFA();

        // Копируем состояния и переходы обоих автоматов
        const thisStateMap = this.copyToAnother(result);
        const otherStateMap = other.copyToAnother(result);

        // Начальное состояние - от первого автомата (переименованное)
        result.setStartState(thisStateMap[this.startState]);

        // ε-переходы от принимающих состояний первого к началу второго
        for (const accept of Object.keys(this.acceptStates)) {
            result.addEpsilonTransition(
                thisStateMap[accept],
                otherStateMap[other.startState]
            );
        }

        // Принимающие состояния - от второго автомата (переименованные)
        for (const accept of Object.keys(other.acceptStates)) {
            const styleInfo = other.acceptStates[accept];
            result.acceptStates[otherStateMap[accept]] = styleInfo;
        }

        return result;
    }

    /**
     * Замыкание Клини (*)
     */
    kleeneStar() {
        const result = new NFA();

        // Копируем исходный автомат
        const stateMap = this.copyToAnother(result);

        // Создаем новое начальное состояние
        const newStart = result.createState();
        const newAccept = result.createState();

        result.setStartState(newStart);

        // Определяем стиль для нового принимающего состояния
        const firstAcceptState = Object.keys(this.acceptStates)[0];
        const styleInfo = firstAcceptState ? this.acceptStates[firstAcceptState] : { style: null, priority: 0 };
        result.addAcceptState(newAccept, styleInfo.style, styleInfo.priority);

        // ε-переход к исходному началу (переименованному)
        result.addEpsilonTransition(newStart, stateMap[this.startState]);

        // ε-переход напрямую к принимающему (для пустой строки)
        result.addEpsilonTransition(newStart, newAccept);

        // ε-переходы от принимающих состояний (переименованных)
        for (const accept of Object.keys(this.acceptStates)) {
            result.addEpsilonTransition(stateMap[accept], newAccept);
            result.addEpsilonTransition(stateMap[accept], stateMap[this.startState]); // цикл
        }

        return result;
    }

    /**
     * Плюс (+) - одно или более повторений
     * a+ эквивалентно aa*
     */
    plus() {
        // Создаем копию оригинального автомата
        const original = new NFA();
        const originalStateMap = this.copyToAnother(original);

        // Устанавливаем начальное и принимающие состояния для копии
        original.setStartState(originalStateMap[this.startState]);
        for (const accept of Object.keys(this.acceptStates)) {
            const styleInfo = this.acceptStates[accept];
            original.acceptStates[originalStateMap[accept]] = styleInfo;
        }

        // Создаем замыкание Клини оригинального автомата
        const star = this.kleeneStar();

        // Конкатенируем: оригинал + замыкание = a + a* = a+
        return original.concatenate(star);
    }

    /**
     * Вопрос (?) - ноль или одно повторение
     */
    question() {
        const result = new NFA();

        // Копируем исходный автомат
        const stateMap = this.copyToAnother(result);

        // Создаем новое начальное состояние
        const newStart = result.createState();
        const newAccept = result.createState();

        result.setStartState(newStart);

        // Определяем стиль для нового принимающего состояния
        const firstAcceptState = Object.keys(this.acceptStates)[0];
        const styleInfo = firstAcceptState ? this.acceptStates[firstAcceptState] : { style: null, priority: 0 };
        result.addAcceptState(newAccept, styleInfo.style, styleInfo.priority);

        // ε-переход к исходному началу (переименованному)
        result.addEpsilonTransition(newStart, stateMap[this.startState]);

        // ε-переход напрямую к принимающему (для пустой строки)
        result.addEpsilonTransition(newStart, newAccept);

        // ε-переходы от принимающих состояний к новому принимающему (переименованные)
        for (const accept of Object.keys(this.acceptStates)) {
            result.addEpsilonTransition(stateMap[accept], newAccept);
        }

        return result;
    }

    /**
     * Копирование состояний и переходов в другой НКА
     */
    copyToAnother(target) {
        // Создаем объект для перименования состояний (избегаем конфликтов)
        const stateMap = {};

        // Копируем состояния с новыми именами
        for (const state of this.states) {
            const newState = target.createState();
            stateMap[state] = newState;
        }

        // Копируем переходы с перименованными состояниями
        for (const fromState in this.transitions) {
            for (const symbol in this.transitions[fromState]) {
                for (const toState of this.transitions[fromState][symbol]) {
                    target.addTransition(
                        stateMap[fromState],
                        symbol,
                        stateMap[toState]
                    );
                }
            }
        }

        // Копируем ε-переходы с перименованными состояниями
        for (const fromState in this.epsilonTransitions) {
            for (const toState of this.epsilonTransitions[fromState]) {
                target.addEpsilonTransition(
                    stateMap[fromState],
                    stateMap[toState]
                );
            }
        }

        // НЕ устанавливаем начальное и принимающие состояния автоматически
        // Это должно делаться в вызывающих методах по необходимости

        return stateMap; // Возвращаем объект для дальнейшего использования
    }

    /**
     * Получение состояний, достижимых из множества состояний по ε-переходам
     */
    getEpsilonClosure(states) {
        const closure = new Set(states);
        const stack = [...states];

        while (stack.length > 0) {
            const state = stack.pop();

            if (this.epsilonTransitions[state]) {
                for (const nextState of this.epsilonTransitions[state]) {
                    if (!closure.has(nextState)) {
                        closure.add(nextState);
                        stack.push(nextState);
                    }
                }
            }
        }

        return Array.from(closure);
    }
}

/**
 * Парсер регулярных выражений
 */
class RegexParser {
    static BAD_CHARS_FOR_ATOM = new Set(['*', '+', '?', ')', '|', ']']);
    
    constructor(regex) {
        this.regex = regex instanceof RegExp ? regex.source : regex;
        this.pos = 0;
    }

    /**
     * Основная функция парсинга
     */
    parse() {
        const nfa = this.parseAlternation();

        if (this.peek() !== null) {
            throw new Error(`Unexpected character '${this.peek()}' at position ${this.pos}`);
        }

        return nfa
    }

    /**
     * Парсинг альтернативы (|)
     */
    parseAlternation() {
        let nfa = this.parseConcatenation();

        while (this.peek() === '|') {
            this.consume('|');
            const right = this.parseConcatenation();
            nfa = NFA.union([nfa, right]);
        }

        return nfa;
    }

    /**
     * Парсинг конкатенации
     */
    parseConcatenation() {
        let nfa = this.parseRepetition();

        while (this.pos < this.regex.length &&
            this.peek() !== '|' &&
            this.peek() !== ')') {
            const next = this.parseRepetition();
            nfa = nfa.concatenate(next);
        }

        return nfa;
    }

    /**
     * Парсинг повторений (*, +, ?)
     */
    parseRepetition() {
        let nfa = this.parseAtom();

        const op = this.peek();
        if (op === '*') {
            this.advance();
            nfa = nfa.kleeneStar();
        } else if (op === '+') {
            this.advance();
            nfa = nfa.plus();
        } else if (op === '?') {
            this.advance();
            nfa = nfa.question();
        }

        return nfa;
    }

    /**
     * Парсинг атомарных выражений
     */
    parseAtom() {
        const char = this.peek();

        if (char === null) {
            throw new Error(`Unexpected end of expression at position ${this.pos}`);
        }

        if (RegexParser.BAD_CHARS_FOR_ATOM.has(char)) {
            throw new Error(`Unexpected character '${char}' at position ${this.pos}`);
        }

        if (char === '(') {
            // Группировка
            this.consume('(');

            if (this.peek() === ')') {
                throw new Error(`Unexpected empty group at position ${this.pos}`);
            }

            const nfa = this.parseAlternation();
            this.consume(')');
            return nfa;
        } else if (char === '[') {
            // Множество символов
            return this.parseCharacterClass();
        } else if (char === '\\') { // Имеется в виду единичный символ "\" а не "\\"
            // Экранированный символ или класс
            return this.parseEscape();
        } else if (char === '.') {
            // Любой символ
            this.advance();
            return this.createAnyCharNFA();
        } else {
            // Обычный символ
            this.advance();
            return this.createCharacterClassNFA(new Set([char]), false);
        }
    }

    /**
     * Парсинг множества символов [...]
     */
    parseCharacterClass() {
        this.consume('[');

        let negated = false;
        if (this.peek() === '^') {
            negated = true;
            this.advance();
        }

        const chars = new Set();

        if (this.peek() === ']') {
            throw new Error(`Unexpected empty character class at position ${this.pos}`);
        }

        while (this.peek() !== ']') {
            const char = this.advance();

            if (char === '\\') {
                // Экранированный символ
                const escapedChar = this.advance(); // Потребляем символ после обратного слеша
                this.getEscapedClass(escapedChar).forEach(char => chars.add(char));
            } else if (this.peek() === '-' && this.peek(1) !== ']') {
                // Диапазон символов
                this.advance(); // consume '-'
                const endChar = this.advance();

                if (char.charCodeAt(0) > endChar.charCodeAt(0)) {
                    throw new Error(`Invalid character range: ${char} - ${endChar} at position ${this.pos}`);
                }

                for (let code = char.charCodeAt(0); code <= endChar.charCodeAt(0); code++) {
                    chars.add(String.fromCharCode(code));
                }
            } else {
                chars.add(char);
            }
        }

        this.consume(']');

        return this.createCharacterClassNFA(chars, negated);
    }

    /**
     * Парсинг экранированных символов и классов
     */
    parseEscape() {
        this.consume('\\');
        const char = this.advance();

        return this.createCharacterClassNFA(this.getEscapedClass(char), false);
    }

    getEscapedClass(char) {
        switch (char) {
            case 'd':
                return UNICODE_CHARS.digits;
            case 'w':
                return UNICODE_CHARS.word;
            case 's':
                return UNICODE_CHARS.whitespace;
            case 'n':
                return new Set(['\n']);
            case 'r':
                return new Set(['\r']);
            case 't':
                return new Set(['\t']);
            default:
                return new Set([char]);
        }
    }

    /**
     * Создание НКА для пустой строки (для пустых групп)
     */
    createEmptyNFA() {
        const nfa = new NFA();
        const start = nfa.createState();

        nfa.setStartState(start);
        nfa.addAcceptState(start, null); // Начальное состояние является также принимающим

        return nfa;
    }

    /**
     * Создание НКА для множества символов
     */
    createCharacterClassNFA(chars, negated) {
        const nfa = new NFA();
        const start = nfa.createState();
        const accept = nfa.createState();

        nfa.setStartState(start);
        nfa.addAcceptState(accept, null);

        if (negated) {
            // Для отрицания создаем переходы для всех символов кроме указанных
            const allChars = this.getAllPrintableChars();
            for (const char of allChars) {
                if (!chars.has(char)) {
                    nfa.addTransition(start, char, accept);
                }
            }
        } else {
            // Создаем переходы для указанных символов
            for (const char of chars) {
                nfa.addTransition(start, char, accept);
            }
        }

        return nfa;
    }

    /**
     * Создание НКА для любого символа (.) - любой символ кроме пробельных
     */
    createAnyCharNFA() {
        const nfa = new NFA();
        const start = nfa.createState();
        const accept = nfa.createState();

        nfa.setStartState(start);
        nfa.addAcceptState(accept, null);

        // Добавляем переходы для всех печатных символов кроме пробельных
        const allChars = this.getAllPrintableChars();
        const whitespaceChars = UNICODE_CHARS.whitespace;

        for (const char of allChars) {
            if (!whitespaceChars.has(char)) {
                nfa.addTransition(start, char, accept);
            }
        }

        return nfa;
    }

    /**
     * Получение множества цифр
     */
    getDigitChars() {
        return UNICODE_CHARS.digits;
    }

    /**
     * Получение всех печатных символов с полной поддержкой Unicode
     */
    getAllPrintableChars() {
        return UNICODE_CHARS.printable;
    }

    /**
     * Получение текущего символа
     */
    peek(offset = 0) {
        const pos = this.pos + offset;
        return pos < this.regex.length ? this.regex[pos] : null;
    }

    /**
     * Переход к следующему символу
     */
    advance() {
        const char = this.peek();
        if (char === null) {
            throw new Error(`Unexpected end of expression at position ${this.pos}`);
        }

        this.pos++;

        return char;
    }

    /**
     * Потребление ожидаемого символа
     */
    consume(expected) {
        const char = this.advance();
        if (char !== expected) {
            throw new Error(`Expected '${expected}', got '${char}' at position ${this.pos - 1}`);
        }
    }
}

export { NFA, RegexParser };