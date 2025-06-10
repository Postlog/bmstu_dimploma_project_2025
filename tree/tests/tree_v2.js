/**
 * Тесты для mealy.js - автомат Мили для раскраски синтаксиса
 * Поддерживает как Node.js, так и браузерное окружение
 */

import assert from 'assert';

import { buildTreeFromFragments, Signal, setLogEnabled } from '../tree_v2.js';
import { NFA } from '../../automaton/nfa.js';
import { DFA } from '../../automaton/dfa.js';
import { MealyMachine } from '../../automaton/mealy.js';

/**
 * Создание автомата Мили из регулярных выражений
 */
function buildTreeFromText(mealy, leaves) {
    const fragments = [];
    let i = 0;
    let text = '';
    for (const leaf of leaves) {
        text += leaf;
        fragments.push({ start: i, end: i + leaf.length });
        i += leaf.length;
    }

    return buildTreeFromFragments(mealy, text, fragments);
}

function validateTree(root) {
    const internalNodes = collectInternalNodes(root);

    for (const node of internalNodes) {
        const startState = node.startState;
        const finishState = node.A[startState];
        const realFinishState = getLeafFinishState(node);
        const realStartState = getLeafStartState(node);

        assert.equal(finishState, realFinishState, `финишное состояние правого листа не совпадает с финишным состоянием внутреннего узла (${node.getText()})`);
        assert.equal(startState, realStartState, `начальное состояние левого листа не совпадает с начальным состоянием внутреннего узла (${node.getText()})`);
    }

    const allLeaves = root.leaves(true).reverse();

    assert.equal(allLeaves[0].signal !== null, true, 'финишный псевдо-лист обязан отправлять сигнал');
    assert.equal(allLeaves[allLeaves.length - 1].signal !== null, false, 'начальный псевдо-лист не должен отправлять сигнал');

    let sentSignal = null;
    for (const leaf of allLeaves) {
        if (sentSignal !== null) {
            assert.equal(leaf.style, sentSignal.style, 'лист не применил стиль сигнала, отправленного к нему');
        }

        sentSignal = leaf.signal;
    }
}

function collectInternalNodes(node) {
    const internalNodes = [];
    const queue = [node];

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current.isLeaf()) {
            internalNodes.push(current);
            if (current.left) { queue.push(current.left); }
            if (current.right) { queue.push(current.right); }
        }
    }

    return internalNodes;
}
function getLeafStartState(node) {
    if (node.isLeaf()) {
        return node.startState;
    }

    if (!node.left) {
        return getLeafStartState(node.right);
    }

    return getLeafStartState(node.left);
}

function getLeafFinishState(node) {
    if (node.isLeaf()) {
        return node.A[node.startState];
    }

    if (!node.right) {
        return getLeafFinishState(node.left);
    }

    return getLeafFinishState(node.right);
}

/**
 * Выполнение одного теста
 */
function runSingleTest(testCase) {
    const treeData = buildTreeFromText(testCase.mealy, testCase.leaves);

    const root = treeData.root;
    let realLeaves = treeData.leaves;

    if (testCase.changedLeaves) {
        for (const mapping of testCase.changedLeaves) {
            for (const [index, leaf] of Object.entries(mapping)) {
                const realLeaf = realLeaves[index];
                realLeaf.onTextChange(leaf);
            }

            realLeaves = root.leaves(false);
        }
    }

    const allLeaves = root.leaves(true);

    try {
        validateTree(root);
        assert.equal(realLeaves.length, testCase.expectedRealLeaves.length, 'количество листьев отличается от ожидаемого');

        for (let i = 0; i < testCase.expectedRealLeaves.length; i++) {
            const leaf = realLeaves[i];
            const expected = testCase.expectedRealLeaves[i];

            assert.equal(leaf.style, expected.style, `лист ${i} имеет неожиданный стиль`);
            assert.deepEqual(leaf.signal, expected.signal, `лист ${i} имеет неожиданный сигнал`);
        }

        assert.equal(allLeaves.length, testCase.expectedPseudoLeaves.length + testCase.expectedRealLeaves.length, 'количество псевдо листьев отличается от ожидаемого');
        const firstPseudoLeaf = allLeaves[0];
        const lastPseudoLeaf = allLeaves[allLeaves.length - 1];

        assert.equal(firstPseudoLeaf.style, testCase.expectedPseudoLeaves[0].style, 'стиль первого псевдо листа отличается от ожидаемого');
        assert.equal(lastPseudoLeaf.style, testCase.expectedPseudoLeaves[testCase.expectedPseudoLeaves.length - 1].style, 'стиль последнего псевдо листа отличается от ожидаемого');

        assert.deepEqual(firstPseudoLeaf.signal, testCase.expectedPseudoLeaves[0].signal, 'сигнал первого псевдо листа отличается от ожидаемого');
        assert.deepEqual(lastPseudoLeaf.signal, testCase.expectedPseudoLeaves[testCase.expectedPseudoLeaves.length - 1].signal, 'сигнал последнего псевдо листа отличается от ожидаемого');
    } catch (error) {
        if (!(error instanceof assert.AssertionError)) {
            throw error;
        }

        console.log(`\t❌ ${testCase.name}: ${error.message}`);
        console.log(`\t\tОжидалось: ${error.expected}`);
        console.log(`\t\tПолучено: ${error.actual}`);

        return false;
    }

    console.log(`\t✅ ${testCase.name}`);
    return true;
}

function createMealyFromRegexes(regexes) {
    const nfas = regexes.map(regex => NFA.fromRegex(regex.regex, regex.style));
    const dfa = DFA.fromNFA(NFA.union(nfas));
    return MealyMachine.fromDFA(dfa);
}

/**
 * Основная функция запуска всех тестов
 */
function runAllTreeTests() {
    setLogEnabled(false);

    const simpleMealy = createMealyFromRegexes([
        { regex: '1[a-z]+2', style: '1kw2' },
        { regex: '1[a-z]+', style: '1kw' },
    ]);

    const numberMealy = createMealyFromRegexes([
        { regex: '[0-9]+', style: 'number' },
        { regex: '\\+|\\-|\\*|\\/', style: 'operator' },
    ]);

    const keywordMealy = createMealyFromRegexes([
        { regex: 'if|else|while|for', style: 'keyword' },
        { regex: '[a-zA-Z_][a-zA-Z0-9_]+', style: 'identifier' },
        { regex: '[0-9]+', style: 'number' },
        { regex: '\\s+', style: 'whitespace' },
    ]);

    const complexMealy = createMealyFromRegexes([
        { regex: 'function', style: 'keyword' },
        { regex: '\\([^)]*\\)', style: 'params' },
        { regex: '\\{[^}]*\\}', style: 'block' },
        { regex: '[a-zA-Z_][a-zA-Z0-9_]*', style: 'identifier' },
        { regex: '\\s+', style: 'whitespace' },
    ]);

    // Единый массив всех тест-кейсов
    const testCases = [
        {
            name: 'Пустой текст',
            mealy: simpleMealy,
            leaves: [],
            expectedRealLeaves: [],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal(null) },
            ],
        },
        {
            name: 'Узлы с пустым текстом',
            mealy: simpleMealy,
            leaves: ['', '1b', ''],
            expectedRealLeaves: [
                { style: null, signal: null },
                { style: '1kw', signal: new Signal(null) },
                { style: '1kw', signal: null },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('1kw') },
            ],
        },
        {
            name: '#1 - Базовый тест с простым автоматом',
            mealy: simpleMealy,
            leaves: [
                '1',
                'a',
                'bc',
                ' ',
            ],
            expectedRealLeaves: [
                { style: '1kw', signal: new Signal(null) },
                { style: '1kw', signal: null },
                { style: '1kw', signal: null },
                { style: null, signal: new Signal('1kw') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal(null) },
            ],
        },
        {
            name: 'Полное совпадение 1kw2',
            mealy: simpleMealy,
            leaves: ['1', 'abc', '2'],
            expectedRealLeaves: [
                { style: '1kw2', signal: new Signal(null) },
                { style: '1kw2', signal: null },
                { style: '1kw2', signal: null },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('1kw2') },
            ],
        },
        {
            name: 'Последовательность чисел и операторов',
            mealy: numberMealy,
            leaves: ['123', '+', '456', '-', '789'],
            expectedRealLeaves: [
                { style: 'number', signal: new Signal(null) },
                { style: 'operator', signal: new Signal('number') },
                { style: 'number', signal: new Signal('operator') },
                { style: 'operator', signal: new Signal('number') },
                { style: 'number', signal: new Signal('operator') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('number') },
            ],
        },
        {
            name: 'Ключевые слова и идентификаторы',
            mealy: keywordMealy,
            leaves: ['if', ' ', 'condition', ' ', 'else', ' ', 'variable'],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'identifier', signal: new Signal('whitespace') },
                { style: 'whitespace', signal: new Signal('identifier') },
                { style: 'keyword', signal: new Signal('whitespace') },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'identifier', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('identifier') },
            ],
        },
        {
            name: 'Одиночный символ',
            mealy: simpleMealy,
            leaves: ['1'],
            expectedRealLeaves: [
                { style: null, signal: new Signal(null) },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal(null) },
            ],
        },
        {
            name: 'Неразпознанные символы',
            mealy: numberMealy,
            leaves: ['abc', '123', 'xyz'],
            expectedRealLeaves: [
                { style: null, signal: new Signal(null) },
                { style: 'number', signal: new Signal(null) },
                { style: null, signal: new Signal('number') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal(null) },
            ],
        },
        {
            name: 'Смешанные распознанные и неразпознанные символы',
            mealy: keywordMealy,
            leaves: ['if', '@', 'var', '#', '123'],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) },
                { style: null, signal: new Signal('keyword') },
                { style: 'identifier', signal: new Signal(null) },
                { style: null, signal: new Signal('identifier') },
                { style: 'number', signal: new Signal(null) },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('number') },
            ],
        },
        {
            name: 'Длинная последовательность одного типа',
            mealy: numberMealy,
            leaves: ['111', '222', '333', '444', '555'],
            expectedRealLeaves: [
                { style: 'number', signal: new Signal(null) },
                { style: 'number', signal: null },
                { style: 'number', signal: null },
                { style: 'number', signal: null },
                { style: 'number', signal: null },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('number') },
            ],
        },
        {
            name: 'Чередование типов',
            mealy: numberMealy,
            leaves: ['1', '+', '2', '*', '3', '/', '4'],
            expectedRealLeaves: [
                { style: 'number', signal: new Signal(null) },
                { style: 'operator', signal: new Signal('number') },
                { style: 'number', signal: new Signal('operator') },
                { style: 'operator', signal: new Signal('number') },
                { style: 'number', signal: new Signal('operator') },
                { style: 'operator', signal: new Signal('number') },
                { style: 'number', signal: new Signal('operator') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('number') },
            ],
        },
        {
            name: 'Частичное совпадение длинного паттерна',
            mealy: simpleMealy,
            leaves: ['1', 'a', 'b', 'c', '3'],
            expectedRealLeaves: [
                { style: '1kw', signal: new Signal(null) },
                { style: '1kw', signal: null },
                { style: '1kw', signal: null },
                { style: '1kw', signal: null },
                { style: null, signal: new Signal('1kw') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal(null) },
            ],
        },
        {
            name: 'Комплексный сценарий с функцией',
            mealy: complexMealy,
            leaves: ['function', ' ', 'test', '()', ' ', '{}'],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'identifier', signal: new Signal('whitespace') },
                { style: 'params', signal: new Signal('identifier') },
                { style: 'whitespace', signal: new Signal('params') },
                { style: 'block', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('block') },
            ],
        },
        {
            name: 'Только пробелы',
            mealy: keywordMealy,
            leaves: [' ', '  ', '\t', '\n'],
            expectedRealLeaves: [
                { style: 'whitespace', signal: new Signal(null) },
                { style: 'whitespace', signal: null },
                { style: 'whitespace', signal: null },
                { style: 'whitespace', signal: null },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('whitespace') },
            ],
        },
        {
            name: 'Граничный случай - очень короткие токены',
            mealy: keywordMealy,
            leaves: ['i', 'f', '1', 'a'],
            expectedRealLeaves: [
                { style: 'identifier', signal: new Signal(null) },
                { style: 'identifier', signal: null },
                { style: 'identifier', signal: null },
                { style: 'identifier', signal: null },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('identifier') },
            ],
        },
        {
            name: 'Все операторы подряд',
            mealy: numberMealy,
            leaves: ['+', '-', '*', '/'],
            expectedRealLeaves: [
                { style: 'operator', signal: new Signal(null) },
                { style: 'operator', signal: new Signal('operator') },
                { style: 'operator', signal: new Signal('operator') },
                { style: 'operator', signal: new Signal('operator') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('operator') },
            ],
        },

        // Тесты с изменениями
        {
            name: 'Изменение текста - узлы не заменяются',
            mealy: keywordMealy,
            leaves: ['1', 'a', 'bc', ' '],
            changedLeaves: [
                {
                    0: '12',
                    1: 'a2',
                    2: 'bcaaa',
                    3: 'else',
                },
                {
                    0: '1233',
                    1: 'a23bob',
                    2: 'b',
                    3: ' ',
                },
            ],
            expectedRealLeaves: [
                { style: 'number', signal: new Signal(null) },
                { style: 'identifier', signal: new Signal('number') },
                { style: 'identifier', signal: null },
                { style: 'whitespace', signal: new Signal('identifier') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('whitespace') },
            ],
        },

        // Тесты с удалением узлов
        {
            name: 'Удаление узла - пустая строка в начале',
            mealy: keywordMealy,
            leaves: ['if', ' ', 'var'],
            changedLeaves: [
                {
                    0: '', // удаляем первый узел
                },
            ],
            expectedRealLeaves: [
                { style: 'whitespace', signal: new Signal(null) },
                { style: 'identifier', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('identifier') },
            ],
        },

        {
            name: 'Удаление узла - пустая строка в середине',
            mealy: keywordMealy,
            leaves: ['if', ' ', 'var', ' ', 'else'],
            changedLeaves: [
                {
                    2: '', // удаляем средний узел
                },
            ],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'whitespace', signal: null },
                { style: 'keyword', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('keyword') },
            ],
        },

        {
            name: 'Удаление узла - пустая строка в конце',
            mealy: keywordMealy,
            leaves: ['123', '+', '456'],
            changedLeaves: [
                {
                    2: '', // удаляем последний узел
                },
            ],
            expectedRealLeaves: [
                { style: 'number', signal: new Signal(null) },
                { style: null, signal: new Signal('number') }, // '+' не распознается как operator без чисел
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal(null) },
            ],
        },

        // Тесты с разбиением узлов
        {
            name: 'Разбиение узла - один токен становится несколькими',
            mealy: keywordMealy,
            leaves: ['variable'],
            changedLeaves: [
                {
                    0: 'if else', // разбиваем на два ключевых слова
                },
            ],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'keyword', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('keyword') },
            ],
        },

        {
            name: 'Разбиение узла - смешанные типы токенов',
            mealy: keywordMealy,
            leaves: ['test'],
            changedLeaves: [
                {
                    0: 'if 123 var', // identifier -> keyword + number + identifier
                },
            ],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'number', signal: new Signal('whitespace') },
                { style: 'whitespace', signal: new Signal('number') },
                { style: 'identifier', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('identifier') },
            ],
        },

        {
            name: 'Разбиение узла - неразпознанные символы',
            mealy: numberMealy,
            leaves: ['123'],
            changedLeaves: [
                {
                    0: '123@456#789', // число -> число + символы + число + символы + число
                },
            ],
            expectedRealLeaves: [
                { style: 'number', signal: new Signal(null) },
                { style: null, signal: new Signal('number') },
                { style: 'number', signal: new Signal(null) },
                { style: null, signal: new Signal('number') },
                { style: 'number', signal: new Signal(null) },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('number') },
            ],
        },

        {
            name: 'Комплексное изменение - удаление и разбиение',
            mealy: keywordMealy,
            leaves: ['old', ' ', 'text', ' ', 'here'],
            changedLeaves: [
                {
                    0: '', // удаляем первый
                    2: 'if 123 else', // разбиваем средний
                    4: '', // удаляем последний
                },
            ],
            expectedRealLeaves: [
                { style: 'whitespace', signal: new Signal(null) },
                { style: 'keyword', signal: new Signal('whitespace') },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'number', signal: new Signal('whitespace') },
                { style: 'whitespace', signal: new Signal('number') },
                { style: 'keyword', signal: new Signal('whitespace') },
                { style: 'whitespace', signal: new Signal('keyword') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('whitespace') },
            ],
        },

        {
            name: 'Каскадное разбиение - множественные изменения',
            mealy: keywordMealy,
            leaves: ['a', 'b'],
            changedLeaves: [
                {
                    0: 'if while ', // a -> if while
                    1: 'for 123', // b -> for 123
                }, // Итого: "if while for 123"
                {
                    0: 'else', // if -> else
                    2: 'var', // while -> var
                    4: '456', // for -> 456
                }, // Итого: "else var 456 123"
            ],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'identifier', signal: new Signal('whitespace') },
                { style: 'whitespace', signal: new Signal('identifier') },
                { style: 'number', signal: new Signal('whitespace') },
                { style: 'whitespace', signal: new Signal('number') },
                { style: 'number', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('number') },
            ],
        },

        // === СЛОЖНЫЕ ТЕСТЫ ДЛЯ ТЕКСТОВОГО РЕДАКТОРА ===

        {
            name: 'Редактор: Написание функции с нуля',
            mealy: keywordMealy,
            leaves: [''],
            changedLeaves: [
                { 0: 'f' }, // Печатаем 'f'
                { 0: 'fu' }, // Печатаем 'u'
                { 0: 'fun' }, // Печатаем 'n'
                { 0: 'func' }, // Печатаем 'c'
                { 0: 'funct' }, // Печатаем 't'
                { 0: 'functi' }, // Печатаем 'i'
                { 0: 'functio' }, // Печатаем 'o'
                { 0: 'function' }, // Печатаем 'n' - это identifier, не keyword
                { 0: 'function ' }, // Добавляем пробел
                { 1: ' t' }, // Печатаем 't'
                { 2: 'te' }, // Печатаем 'e'
                { 2: 'tes' }, // Печатаем 's'
                { 2: 'test' }, // Печатаем 't' - теперь это identifier
            ],
            expectedRealLeaves: [
                { style: 'identifier', signal: new Signal(null) }, // 'function' не keyword в нашей грамматике
                { style: 'whitespace', signal: new Signal('identifier') },
                { style: 'identifier', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('identifier') },
            ],
        },

        {
            name: 'Редактор: Backspace в середине токена',
            mealy: keywordMealy,
            leaves: ['variable', ' ', 'name'],
            changedLeaves: [
                { 0: 'variabl' }, // Удаляем последний символ
                { 0: 'variab' }, // Еще один backspace
                { 0: 'varia' }, // Еще один backspace
                { 0: 'vari' }, // Еще один backspace
                { 0: 'var' }, // Теперь это сокращенный identifier
            ],
            expectedRealLeaves: [
                { style: 'identifier', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('identifier') },
                { style: 'identifier', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('identifier') },
            ],
        },

        // {
        //   name: 'Редактор: Превращение identifier в keyword',
        //   mealy: keywordMealy,
        //   leaves: ['i', 'f', 'f'],
        //   changedLeaves: [
        //     { 2: '' }, // Удаляем последний 'f'
        //     { 0: '', 1: '' }, // Удаляем первые два символа, остается пустота
        //     { '-1': 'if' }, // Вводим 'if' - теперь это keyword
        //   ],
        //   expectedRealLeaves: [
        //     { style: 'keyword', signal: new Signal(null) },
        //   ],
        //   expectedPseudoLeaves: [
        //     { style: null, signal: null },
        //     { style: null, signal: new Signal('keyword') },
        //   ],
        // },

        {
            name: 'Редактор: Разделение токена вставкой пробела',
            mealy: keywordMealy,
            leaves: ['ifelse'],
            changedLeaves: [
                { 0: 'if else' }, // Вставляем пробел - один токен становится двумя keywords
            ],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'keyword', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('keyword') },
            ],
        },

        {
            name: 'Редактор: Множественные быстрые изменения',
            mealy: keywordMealy,
            leaves: ['test'],
            changedLeaves: [
                { 0: 'tes' },
                { 0: 'te' },
                { 0: 't' },
                { 0: 'i' },
                { 0: 'if' },
                { 0: 'if ' },
                { 1: ' e' },
                { 2: 'el' },
                { 2: 'els' },
                { 2: 'else' },
            ],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'keyword', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('keyword') },
            ],
        },

        {
            name: 'Редактор: Каскадное изменение типов токенов',
            mealy: keywordMealy,
            leaves: ['123', ' ', 'abc', ' ', '456'],
            changedLeaves: [
                { 0: 'if', 2: 'else', 4: 'while' }, // Все числа становятся keywords
                { 1: '', 3: '' }, // Удаляем пробелы - все сливается
            ],
            expectedRealLeaves: [
                { style: 'identifier', signal: new Signal(null) }, // 'if'
                { style: 'identifier', signal: null }, // 'else'
                { style: 'identifier', signal: null }, // 'while'
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('identifier') },
            ],
        },

        {
            name: 'Редактор: Комментарий и раскомментирование',
            mealy: createMealyFromRegexes([
                { regex: '//.*', style: 'comment' },
                { regex: 'if|else|while|for', style: 'keyword' },
                { regex: '[a-zA-Z_][a-zA-Z0-9_]*', style: 'identifier' },
                { regex: '\\s+', style: 'whitespace' },
            ]),
            leaves: ['if', ' ', 'condition'],
            changedLeaves: [
                { 0: '//if' }, // Комментируем
                { 0: 'if' }, // Раскомментируем
            ],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'identifier', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('identifier') },
            ],
        },

        {
            name: 'Редактор: Очень сложный сценарий с числами',
            mealy: createMealyFromRegexes([
                { regex: '\\d+\\.\\d+', style: 'float' },
                { regex: '\\d+', style: 'integer' },
                { regex: '\\+|\\-|\\*|\\/', style: 'operator' },
                { regex: '[a-zA-Z_][a-zA-Z0-9_]*', style: 'identifier' },
                { regex: '\\s+', style: 'whitespace' },
            ]),
            leaves: ['123'],
            changedLeaves: [
                { 0: '123.' }, // Начинаем вводить float
                { 0: '123.4' }, // Теперь это float
                { 0: '123.45' }, // Полный float
                { 0: '123.45 ' }, // Добавляем пробел
                { 1: ' +' }, // Добавляем оператор
                { 2: '+ ' }, // Еще пробел
                { 3: ' 67' }, // Еще число
                { 4: '67.' }, // Начинаем второй float
                { 4: '67.89' }, // Завершаем второй float
            ],
            expectedRealLeaves: [
                { style: 'float', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('float') },
                { style: 'operator', signal: new Signal('whitespace') },
                { style: 'whitespace', signal: new Signal('operator') },
                { style: 'float', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('float') },
            ],
        },

        {
            name: 'Редактор: Удаление посреди выражения',
            mealy: keywordMealy,
            leaves: ['if', ' ', '(', 'condition', ')', ' ', '{'],
            changedLeaves: [
                { 2: '', 4: '' }, // Удаляем скобки -> ['if', ' ', 'condition', ' ', '{'}]
                { 3: '' }, // Удаляем пробел> ['if', ' ', 'condition', '{'}]
            ],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) }, // 'if'
                { style: 'whitespace', signal: new Signal('keyword') }, // ' '
                { style: 'identifier', signal: new Signal('whitespace') }, // 'condition'
                { style: null, signal: new Signal('identifier') }, // '{'
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal(null) },
            ],
        },

        {
            name: 'Редактор: Замена в цикле',
            mealy: keywordMealy,
            leaves: ['for', ' ', 'i', ' ', 'in', ' ', 'range'],
            changedLeaves: [
                { 0: 'while' }, // Меняем цикл
                { 2: 'condition' }, // Меняем переменную
                { 4: '' }, // Удаляем 'in'
                { 4: '' }, // Удаляем пробел после 'in'
            ],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'identifier', signal: new Signal('whitespace') },
                { style: 'whitespace', signal: new Signal('identifier') },
                { style: 'identifier', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('identifier') },
            ],
        },

        {
            name: 'Редактор: Экстремальное разбиение и слияние',
            mealy: keywordMealy,
            leaves: ['abcdefghijk'],
            changedLeaves: [
                { 0: 'abc def ghijk' }, // Разбиваем на части
                { 0: 'if ', 1: '', 2: 'else ', 3: '', 4: 'while' }, // Превращаем в keywords
                { 0: '', 1: '', 2: 'ifelsewhile', 3: '', 4: '' }, // Сливаем обратно
                { 0: 'if else while for' }, // Снова разбиваем с дополнением
                { 1: '  ', 3: '  ', 5: '  '}, // Двойные пробелы
            ],
            expectedRealLeaves: [
                { style: 'keyword', signal: new Signal(null) },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'keyword', signal: new Signal('whitespace') },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'keyword', signal: new Signal('whitespace') },
                { style: 'whitespace', signal: new Signal('keyword') },
                { style: 'keyword', signal: new Signal('whitespace') },
            ],
            expectedPseudoLeaves: [
                { style: null, signal: null },
                { style: null, signal: new Signal('keyword') },
            ],
        },
    ];

    const total = testCases.length;
    console.log(`🚀 ЗАПУСК ВСЕХ ТЕСТОВ ДЕРЕВА (${total} штук):`);

    let passed = 0;

    for (const testCase of testCases) {
        if (runSingleTest(testCase)) {
            passed++;
        }
    }

    const allSuccess = passed === total;

    if (!allSuccess) {
        console.log(`\n${'-'.repeat(80)}`);
        console.log(`❌ Не пройдено: ${total - passed} тестов`);
        process.exit(1);
    }

    return { totalPassed: passed, totalTests: total, success: allSuccess };
}

if (typeof window === 'undefined') {
    runAllTreeTests();
}
