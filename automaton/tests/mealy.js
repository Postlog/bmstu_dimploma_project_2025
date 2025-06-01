/**
 * Тесты для mealy.js - автомат Мили для раскраски синтаксиса
 * Поддерживает как Node.js, так и браузерное окружение
 */

import { NFA } from '../nfa.js';
import { DFA } from '../dfa.js';
import { MealyMachine, runMealy } from '../mealy.js';

/**
 * Создание автомата Мили из регулярных выражений
 */
function createMealyFromRegexes(regexes) {
    const nfas = regexes.map(regex => NFA.fromRegex(regex.regex, regex.style));
    const dfa = DFA.fromNFA(NFA.union(nfas));
    return MealyMachine.fromDFA(dfa);
}

/**
 * Выполнение одного теста
 */
function runSingleTest(testCase) {
    try {
        const result = runMealy(testCase.mealy, testCase.input);
        const success = JSON.stringify(result) === JSON.stringify(testCase.expectedResult);

        const status = success ? '✅' : '❌';

        console.log(`\t${status} ${testCase.name}`);

        if (!success) {
            console.log(`\tВход: ${JSON.stringify(testCase.input)}`);
            console.log('\tПолучено:');
            for (const resultItem of result) {
                const text = testCase.input.slice(resultItem.start, resultItem.end + 1);
                console.log(`\t\t${JSON.stringify(resultItem)} "${text}"`);
            }

            console.log('\tОжидалось:');
            for (const expected of testCase.expectedResult) {
                const text = testCase.input.slice(expected.start, expected.end + 1);
                console.log(`\t\t${JSON.stringify(expected)} "${text}"`);
            }
        }

        return success;
    } catch (error) {
        console.log(`\t💥 ОШИБКА в тесте "${testCase.name}": ${error.message}`);
        console.log(`\t\tСтек: ${error.stack}`);
        return false;
    }
}

/**
 * Основная функция запуска всех тестов
 */
function runAllMealyTests() {
    const jsSyntax = createMealyFromRegexes([
        { regex: 'if|else|for|while|function|return|var|let|const|class|import|export', style: 'keyword' },
        { regex: '[a-zA-Z_$][a-zA-Z0-9_$]*', style: 'identifier' },
        { regex: '[0-9]+(\\.[0-9]+)?([eE][+-]?[0-9]+)?', style: 'number' },
        { regex: '/\\*([^*]|\\*[^/])*\\*/', style: 'comment' },
        { regex: '//[^\n]*', style: 'comment' },
        { regex: '"([^"\\\\]|\\\\.)*"|\'([^\'\\\\]|\\\\.)*\'|`([^`\\\\]|\\\\.)*`', style: 'string' },
        { regex: '[+\\-*/=<>!&|%^~]+', style: 'operator' },
        { regex: '[{}(),;.]', style: 'punctuation' },
        { regex: '\\s+', style: 'whitespace' },
    ]);

    // Единый массив всех тест-кейсов
    const testCases = [
    // ========== БАЗОВЫЕ ОПЕРАЦИИ ==========
        {
            name: 'Одиночный символ',
            mealy: createMealyFromRegexes([{ regex: 'a', style: 'keyword' }]),
            input: 'a',
            expectedResult: [{ start: 0, end: 0, style: 'keyword' }],
        },
        {
            name: 'Простое слово',
            mealy: createMealyFromRegexes([{ regex: 'hello', style: 'identifier' }]),
            input: 'hello',
            expectedResult: [{ start: 0, end: 4, style: 'identifier' }],
        },
        {
            name: 'Альтернативы if|else',
            mealy: createMealyFromRegexes([{ regex: 'if|else', style: 'keyword' }]),
            input: 'if else unknown',
            expectedResult: [
                { start: 0, end: 1, style: 'keyword' },
                { start: 3, end: 6, style: 'keyword' },
            ],
        },

        // ========== КВАНТИФИКАТОРЫ ==========
        {
            name: 'Плюс - повторения',
            mealy: createMealyFromRegexes([{ regex: 'a+', style: 'identifier' }]),
            input: 'aaa b aa',
            expectedResult: [
                { start: 0, end: 2, style: 'identifier' },
                { start: 6, end: 7, style: 'identifier' },
            ],
        },
        {
            name: 'Звездочка - пустая строка',
            mealy: createMealyFromRegexes([{ regex: 'a*', style: 'identifier' }]),
            input: '',
            expectedResult: [],
        },
        {
            name: 'Звездочка - не пустая строка',
            mealy: createMealyFromRegexes([{ regex: 'a*', style: 'identifier' }]),
            input: 'aa',
            expectedResult: [{ start: 0, end: 1, style: 'identifier' }],
        },
        {
            name: 'Вопрос - опциональный символ',
            mealy: createMealyFromRegexes([{ regex: 'colou?r', style: 'word' }]),
            input: 'color colour colors',
            expectedResult: [
                { start: 0, end: 4, style: 'word' },
                { start: 6, end: 11, style: 'word' },
                { start: 13, end: 17, style: 'word' },
            ],
        },

        // ========== СЛОЖНЫЕ ГРУППЫ И ВЛОЖЕННОСТЬ ==========
        {
            name: 'Простые группы (abc|def)',
            mealy: createMealyFromRegexes([{ regex: '(abc|def)', style: 'group' }]),
            input: 'abc def xyz abc',
            expectedResult: [
                { start: 0, end: 2, style: 'group' },
                { start: 4, end: 6, style: 'group' },
                { start: 12, end: 14, style: 'group' },
            ],
        },
        {
            name: 'Группы с квантификаторами (ab|cd)+',
            mealy: createMealyFromRegexes([{ regex: '(ab|cd)+', style: 'repeat' }]),
            input: 'ab cd abcd cdab xyz abcdab',
            expectedResult: [
                { start: 0, end: 1, style: 'repeat' },
                { start: 3, end: 4, style: 'repeat' },
                { start: 6, end: 9, style: 'repeat' },
                { start: 11, end: 14, style: 'repeat' },
                { start: 20, end: 25, style: 'repeat' },
            ],
        },
        {
            name: 'Вложенные группы ((a|b)c|d)+',
            mealy: createMealyFromRegexes([{ regex: '((a|b)c|d)+', style: 'nested' }]),
            input: 'ac bc d acd bcd dd xyz',
            expectedResult: [
                { start: 0, end: 1, style: 'nested' },
                { start: 3, end: 4, style: 'nested' },
                { start: 6, end: 6, style: 'nested' },
                { start: 8, end: 10, style: 'nested' },
                { start: 12, end: 14, style: 'nested' },
                { start: 16, end: 17, style: 'nested' },
            ],
        },
        {
            name: 'Сложная вложенность (a(b|c)+d|e(f|g)*h)',
            mealy: createMealyFromRegexes([{ regex: '(a(b|c)+d|e(f|g)*h)', style: 'complex' }]),
            input: 'abd acd abcd acbd eh efh eggh efgfh xyz',
            expectedResult: [
                { start: 0, end: 2, style: 'complex' },
                { start: 4, end: 6, style: 'complex' },
                { start: 8, end: 11, style: 'complex' },
                { start: 13, end: 16, style: 'complex' },
                { start: 18, end: 19, style: 'complex' },
                { start: 21, end: 23, style: 'complex' },
                { start: 25, end: 28, style: 'complex' },
                { start: 30, end: 34, style: 'complex' },
            ],
        },

        // ========== СИМВОЛЬНЫЕ КЛАССЫ ==========
        {
            name: 'Простые классы [abc]',
            mealy: createMealyFromRegexes([{ regex: '[abc]+', style: 'chars' }]),
            input: 'abc def cab xyz',
            expectedResult: [
                { start: 0, end: 2, style: 'chars' },
                { start: 8, end: 10, style: 'chars' },
            ],
        },
        {
            name: 'Диапазоны [a-z] и [0-9]',
            mealy: createMealyFromRegexes([
                { regex: '[a-z]+', style: 'lower' },
                { regex: '[0-9]+', style: 'digit' },
            ]),
            input: 'abc 123 XYZ def 456',
            expectedResult: [
                { start: 0, end: 2, style: 'lower' },
                { start: 4, end: 6, style: 'digit' },
                { start: 12, end: 14, style: 'lower' },
                { start: 16, end: 18, style: 'digit' },
            ],
        },
        {
            name: 'Отрицательные классы [^abc]',
            mealy: createMealyFromRegexes([{ regex: '[^abc ]+', style: 'not_abc' }]),
            input: 'abc def xyz abc',
            expectedResult: [
                { start: 4, end: 6, style: 'not_abc' },
                { start: 8, end: 10, style: 'not_abc' },
            ],
        },
        {
            name: 'Сложные классы [A-Za-z0-9_]',
            mealy: createMealyFromRegexes([{ regex: '[A-Za-z0-9_]+', style: 'identifier' }]),
            input: 'var_123 test-case $special @symbol',
            expectedResult: [
                { start: 0, end: 6, style: 'identifier' },
                { start: 8, end: 11, style: 'identifier' },
                { start: 13, end: 16, style: 'identifier' },
                { start: 19, end: 25, style: 'identifier' },
                { start: 28, end: 33, style: 'identifier' },
            ],
        },

        // ========== ЭКРАНИРОВАНИЕ ==========
        {
            name: 'Экранированные символы \\d\\w\\s',
            mealy: createMealyFromRegexes([
                { regex: '\\d+', style: 'digits' },
                { regex: '\\w+', style: 'word' },
                { regex: '\\s+', style: 'space' },
            ]),
            input: '123 hello   456_test',
            expectedResult: [
                { start: 0, end: 2, style: 'digits' },
                { start: 3, end: 3, style: 'space' },
                { start: 4, end: 8, style: 'word' },
                { start: 9, end: 11, style: 'space' },
                { start: 12, end: 14, style: 'digits' },
                { start: 16, end: 19, style: 'word' },
            ],
        },
        {
            name: 'Экранирование спецсимволов [+\\-*]',
            mealy: createMealyFromRegexes([{ regex: '[+\\-*/]+', style: 'operators' }]),
            input: '++ -- ** // xyz +-*/',
            expectedResult: [
                { start: 0, end: 1, style: 'operators' },
                { start: 3, end: 4, style: 'operators' },
                { start: 6, end: 7, style: 'operators' },
                { start: 9, end: 10, style: 'operators' },
                { start: 16, end: 19, style: 'operators' },
            ],
        },
        {
            name: 'Литеральный обратный слеш \\\\d',
            mealy: createMealyFromRegexes([{ regex: '\\\\d', style: 'literal' }]),
            input: '\\d \\\\d \\w',
            expectedResult: [
                { start: 0, end: 1, style: 'literal' },
            ],
        },

        // ========== ТОЧКА И СПЕЦИАЛЬНЫЕ СИМВОЛЫ ==========
        {
            name: 'Точка . (любой символ кроме пробельных)',
            mealy: createMealyFromRegexes([{ regex: '.+', style: 'any' }]),
            input: 'abc def\tghi',
            expectedResult: [
                { start: 0, end: 2, style: 'any' },
                { start: 4, end: 6, style: 'any' },
                { start: 8, end: 10, style: 'any' },
            ],
        },
        {
            name: 'Комбинация точки с группами a.+b',
            mealy: createMealyFromRegexes([{ regex: 'a.+b', style: 'pattern' }]),
            input: 'axb a123b a b axyzzb',
            expectedResult: [
                { start: 0, end: 2, style: 'pattern' },
                { start: 4, end: 8, style: 'pattern' },
                { start: 14, end: 19, style: 'pattern' },
            ],
        },

        // ========== ПРИОРИТЕТЫ И КОНФЛИКТЫ ==========
        {
            name: 'Приоритет: более длинное совпадение',
            mealy: createMealyFromRegexes([
                { regex: '[a-z]+', style: 'short' },
                { regex: '[a-z]+\\d', style: 'long' },
            ]),
            input: 'test1 aboba var1 xyz',
            expectedResult: [
                { start: 0, end: 4, style: 'long' },
                { start: 6, end: 10, style: 'short' },
                { start: 12, end: 15, style: 'long' },
                { start: 17, end: 19, style: 'short' },
            ],
        },
        {
            name: 'Приоритет: порядок правил',
            mealy: createMealyFromRegexes([
                { regex: 'if|else|for|while', style: 'keyword' },
                { regex: '[a-zA-Z]+', style: 'identifier' },
            ]),
            input: 'if variable for unknown',
            expectedResult: [
                { start: 0, end: 1, style: 'keyword' },
                { start: 3, end: 10, style: 'identifier' },
                { start: 12, end: 14, style: 'keyword' },
                { start: 16, end: 22, style: 'identifier' },
            ],
        },
        {
            name: 'Конфликт перекрывающихся правил',
            mealy: createMealyFromRegexes([
                { regex: 'test', style: 'exact' },
                { regex: 'test.*', style: 'prefix' },
                { regex: '.*ing', style: 'suffix' },
            ]),
            input: 'test testing something',
            expectedResult: [
                { start: 0, end: 3, style: 'exact' },
                { start: 5, end: 11, style: 'prefix' },
                { start: 13, end: 21, style: 'suffix' },
            ],
        },

        // ========== МНОГОСТРОЧНЫЕ КОММЕНТАРИИ ==========
        {
            name: 'Простой многострочный комментарий',
            mealy: createMealyFromRegexes([{ regex: '/\\*([^*]|\\*[^/])*\\*/', style: 'comment' }]),
            input: '/* comment */ code /* another */',
            expectedResult: [
                { start: 0, end: 12, style: 'comment' },
                { start: 19, end: 31, style: 'comment' },
            ],
        },
        {
            name: 'Многострочный комментарий со звездочками',
            mealy: createMealyFromRegexes([{ regex: '/\\*([^*]|\\*[^/])*\\*/', style: 'comment' }]),
            input: '/* * ** *** */ code',
            expectedResult: [
                { start: 0, end: 13, style: 'comment' },
            ],
        },
        {
            name: 'Вложенные звездочки в комментарии',
            mealy: createMealyFromRegexes([{ regex: '/\\*([^*]|\\*[^/])*\\*/', style: 'comment' }]),
            input: '/* text * more * text */',
            expectedResult: [
                { start: 0, end: 23, style: 'comment' },
            ],
        },

        // ========== СТРОКИ С ЭКРАНИРОВАНИЕМ ==========
        {
            name: 'Строки с экранированными кавычками',
            mealy: createMealyFromRegexes([{ regex: '"([^"\\\\]|\\\\.)*"', style: 'string' }]),
            input: '"hello" "say \\"hi\\"" "normal"',
            expectedResult: [
                { start: 0, end: 6, style: 'string' },
                { start: 8, end: 19, style: 'string' },
                { start: 21, end: 28, style: 'string' },
            ],
        },
        {
            name: 'Одинарные кавычки с экранированием',
            mealy: createMealyFromRegexes([{ regex: '\'([^\'\\\\]|\\\\.)*\'', style: 'string' }]),
            input: '\'hello\' \'don\\\'t\' \'normal\'',
            expectedResult: [
                { start: 0, end: 6, style: 'string' },
                { start: 8, end: 15, style: 'string' },
                { start: 17, end: 24, style: 'string' },
            ],
        },

        // ========== ЧИСЛА С ПЛАВАЮЩЕЙ ТОЧКОЙ ==========
        {
            name: 'Целые и дробные числа',
            mealy: createMealyFromRegexes([{ regex: '[0-9]+(\\.[0-9]+)?', style: 'number' }]),
            input: '123 45.67 0.5 100 3.14159',
            expectedResult: [
                { start: 0, end: 2, style: 'number' },
                { start: 4, end: 8, style: 'number' },
                { start: 10, end: 12, style: 'number' },
                { start: 14, end: 16, style: 'number' },
                { start: 18, end: 24, style: 'number' },
            ],
        },
        {
            name: 'Научная нотация',
            mealy: createMealyFromRegexes([{ regex: '[0-9]+(\\.[0-9]+)?([eE][+-]?[0-9]+)?', style: 'number' }]),
            input: '1e5 2.5e-3 3.14E+2 42',
            expectedResult: [
                { start: 0, end: 2, style: 'number' },
                { start: 4, end: 9, style: 'number' },
                { start: 11, end: 17, style: 'number' },
                { start: 19, end: 20, style: 'number' },
            ],
        },

        // ========== ГРАНИЧНЫЕ СЛУЧАИ ==========
        {
            name: 'Пустая строка',
            mealy: createMealyFromRegexes([{ regex: 'test', style: 'word' }]),
            input: '',
            expectedResult: [],
        },
        {
            name: 'Только пробелы',
            mealy: createMealyFromRegexes([{ regex: '\\s+', style: 'space' }]),
            input: '   \t\n  ',
            expectedResult: [
                { start: 0, end: 6, style: 'space' },
            ],
        },
        {
            name: 'Несовпадающие символы',
            mealy: createMealyFromRegexes([{ regex: 'abc', style: 'exact' }]),
            input: 'xyz def',
            expectedResult: [],
        },
        {
            name: 'Очень длинная строка',
            mealy: createMealyFromRegexes([{ regex: 'a+', style: 'long' }]),
            input: 'a'.repeat(1000),
            expectedResult: [{ start: 0, end: 999, style: 'long' }],
        },
        {
            name: 'Одиночные символы',
            mealy: createMealyFromRegexes([{ regex: '.', style: 'char' }]),
            input: 'abc',
            expectedResult: [
                { start: 0, end: 0, style: 'char' },
                { start: 1, end: 1, style: 'char' },
                { start: 2, end: 2, style: 'char' },
            ],
        },

        // ========== РЕАЛЬНЫЙ JAVASCRIPT СИНТАКСИС ==========
        {
            name: 'JavaScript с полной пунктуацией',
            mealy: jsSyntax,
            input: 'function test(a, b) { return a + b; }',
            expectedResult: [
                { start: 0, end: 7, style: 'keyword' },      // function
                { start: 8, end: 8, style: 'whitespace' },   // пробел
                { start: 9, end: 12, style: 'identifier' },  // test
                { start: 13, end: 13, style: 'punctuation' }, // (
                { start: 14, end: 14, style: 'identifier' }, // a
                { start: 15, end: 15, style: 'punctuation' }, // ,
                { start: 16, end: 16, style: 'whitespace' }, // пробел
                { start: 17, end: 17, style: 'identifier' }, // b
                { start: 18, end: 18, style: 'punctuation' }, // )
                { start: 19, end: 19, style: 'whitespace' }, // пробел
                { start: 20, end: 20, style: 'punctuation' }, // {
                { start: 21, end: 21, style: 'whitespace' }, // пробел
                { start: 22, end: 27, style: 'keyword' },    // return
                { start: 28, end: 28, style: 'whitespace' }, // пробел
                { start: 29, end: 29, style: 'identifier' }, // a
                { start: 30, end: 30, style: 'whitespace' }, // пробел
                { start: 31, end: 31, style: 'operator' },   // +
                { start: 32, end: 32, style: 'whitespace' }, // пробел
                { start: 33, end: 33, style: 'identifier' }, // b
                { start: 34, end: 34, style: 'punctuation' }, // ;
                { start: 35, end: 35, style: 'whitespace' }, // пробел
                { start: 36, end: 36, style: 'punctuation' },  // }
            ],
        },
        {
            name: 'JavaScript функция (упрощенный)',
            mealy: createMealyFromRegexes([
                { regex: 'function|if|return', style: 'keyword' },
                { regex: '[a-zA-Z_$][a-zA-Z0-9_$]*', style: 'identifier' },
                { regex: '[0-9]+', style: 'number' },
                { regex: '[+\\-*/=<>!]+', style: 'operator' },
            ]),
            input: 'function fibonacci n if n return n return fibonacci n',
            expectedResult: [
                { start: 0, end: 7, style: 'keyword' },      // function
                { start: 9, end: 17, style: 'identifier' },  // fibonacci
                { start: 19, end: 19, style: 'identifier' }, // n
                { start: 21, end: 22, style: 'keyword' },    // if
                { start: 24, end: 24, style: 'identifier' }, // n
                { start: 26, end: 31, style: 'keyword' },    // return
                { start: 33, end: 33, style: 'identifier' }, // n
                { start: 35, end: 40, style: 'keyword' },    // return
                { start: 42, end: 50, style: 'identifier' }, // fibonacci
                { start: 52, end: 52, style: 'identifier' },  // n
            ],
        },
        {
            name: 'JavaScript с комментариями (упрощенный)',
            mealy: createMealyFromRegexes([
                { regex: '//[^\n]*', style: 'comment' },
                { regex: 'const|let', style: 'keyword' },
                { regex: '[a-zA-Z_$][a-zA-Z0-9_$]*', style: 'identifier' },
                { regex: '"[^"]*"', style: 'string' },
                { regex: '[0-9]+(\\.[0-9]+)?([eE][+-]?[0-9]+)?', style: 'number' },
                { regex: '[=+\\-*/]', style: 'operator' },
            ]),
            input: '// Comment\nconst result = "Hello" let x = 42.5e-2',
            expectedResult: [
                { start: 0, end: 9, style: 'comment' },
                { start: 11, end: 15, style: 'keyword' },
                { start: 17, end: 22, style: 'identifier' },
                { start: 24, end: 24, style: 'operator' },
                { start: 26, end: 32, style: 'string' },
                { start: 34, end: 36, style: 'keyword' },
                { start: 38, end: 38, style: 'identifier' },
                { start: 40, end: 40, style: 'operator' },
                { start: 42, end: 48, style: 'number' },
            ],
        },

        // ========== СТРЕСС-ТЕСТЫ ==========
        {
            name: 'Множественные альтернативы',
            mealy: createMealyFromRegexes([{ regex: 'a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z', style: 'letter' }]),
            input: 'abcdefghijklmnopqrstuvwxyz',
            expectedResult: Array.from({length: 26}, (_, i) => ({ start: i, end: i, style: 'letter' })),
        },
        {
            name: 'Глубокая вложенность групп',
            mealy: createMealyFromRegexes([{ regex: '(((a|b)+c)+d)+', style: 'deep' }]),
            input: 'acd bcd abcd bacd',
            expectedResult: [
                { start: 0, end: 2, style: 'deep' },
                { start: 4, end: 6, style: 'deep' },
                { start: 8, end: 11, style: 'deep' },
                { start: 13, end: 16, style: 'deep' },
            ],
        },
        {
            name: 'Комбинация всех операторов',
            mealy: createMealyFromRegexes([{ regex: '(a+|b*|c?)+d', style: 'combo' }]),
            input: 'aaad bd cd d aaabbbccccd',
            expectedResult: [
                { start: 0, end: 3, style: 'combo' },
                { start: 5, end: 6, style: 'combo' },
                { start: 8, end: 9, style: 'combo' },
                { start: 11, end: 11, style: 'combo' },
                { start: 13, end: 23, style: 'combo' },
            ],
        },
    ];

    const total = testCases.length;
    console.log(`🚀 ЗАПУСК ВСЕХ ТЕСТОВ АВТОМАТА МИЛИ (${total} штука):`);

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
    runAllMealyTests();
}
