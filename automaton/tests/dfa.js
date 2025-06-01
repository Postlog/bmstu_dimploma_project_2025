/**
 * Тесты для dfa.js - ДКА (детерминированный конечный автомат)
 * Поддерживает как Node.js, так и браузерное окружение
 */

import { NFA } from '../nfa.js';
import { DFA, runDFA } from '../dfa.js';

/**
 * Выполнение одного теста ДКА
 */
function runSingleTest(testCase) {
    try {
        const nfa = NFA.fromRegex(testCase.regex, testCase.style || 'test-style');
        const dfa = DFA.fromNFA(nfa);
        const result = runDFA(dfa, testCase.input);

        const success = result === testCase.expected;
        const status = success ? '✅' : '❌';
        const displayString = testCase.input === '' ? '(пустая)' : `"${testCase.input}"`;

        console.log(`\t${status} ${testCase.name}`);

        if (!success) {
            console.log(`\tВход: ${displayString}`);
            console.log(`\tРегекс: ${testCase.regex}`);
            console.log(`\tПолучено: ${result}`);
            console.log(`\tОжидалось: ${testCase.expected}`);

            if (testCase.description) {
                console.log(`\tОписание: ${testCase.description}`);
            }
        }

        return success;
    } catch (error) {
        console.log(`\t💥 ОШИБКА в тесте "${testCase.name}": ${error.message}`);
        return false;
    }
}

/**
 * Основная функция запуска всех тестов ДКА
 */
function runAllDFATests() {
    // Единый массив всех тест-кейсов
    const testCases = [
    // ========== БАЗОВЫЕ ОПЕРАЦИИ ==========
        {
            name: 'Одиночный символ - совпадение',
            regex: 'a',
            input: 'a',
            expected: true,
            description: 'Простейший случай - один символ',
        },
        {
            name: 'Одиночный символ - несовпадение',
            regex: 'a',
            input: 'b',
            expected: false,
            description: 'Другой символ не должен совпадать',
        },
        {
            name: 'Одиночный символ - пустая строка',
            regex: 'a',
            input: '',
            expected: false,
            description: 'Пустая строка не совпадает с символом',
        },
        {
            name: 'Одиночный символ - лишние символы',
            regex: 'a',
            input: 'aa',
            expected: false,
            description: 'Лишние символы делают строку неподходящей',
        },

        // ========== ПРОСТЫЕ СЛОВА ==========
        {
            name: 'Простое слово - точное совпадение',
            regex: 'hello',
            input: 'hello',
            expected: true,
            description: 'Точное совпадение слова',
        },
        {
            name: 'Простое слово - частичное совпадение',
            regex: 'hello',
            input: 'hell',
            expected: false,
            description: 'Частичное совпадение не засчитывается',
        },
        {
            name: 'Простое слово - с лишними символами',
            regex: 'hello',
            input: 'hello world',
            expected: false,
            description: 'Лишние символы после слова',
        },
        {
            name: 'Простое слово - неправильное',
            regex: 'hello',
            input: 'world',
            expected: false,
            description: 'Совершенно другое слово',
        },

        // ========== АЛЬТЕРНАТИВЫ ==========
        {
            name: 'Альтернатива - первый вариант',
            regex: 'a|b',
            input: 'a',
            expected: true,
            description: 'Первый вариант альтернативы',
        },
        {
            name: 'Альтернатива - второй вариант',
            regex: 'a|b',
            input: 'b',
            expected: true,
            description: 'Второй вариант альтернативы',
        },
        {
            name: 'Альтернатива - несовпадение',
            regex: 'a|b',
            input: 'c',
            expected: false,
            description: 'Символ не из альтернативы',
        },
        {
            name: 'Альтернатива слов - первое слово',
            regex: 'hello|world',
            input: 'hello',
            expected: true,
            description: 'Первое слово из альтернативы',
        },
        {
            name: 'Альтернатива слов - второе слово',
            regex: 'hello|world',
            input: 'world',
            expected: true,
            description: 'Второе слово из альтернативы',
        },
        {
            name: 'Альтернатива слов - несовпадение',
            regex: 'hello|world',
            input: 'test',
            expected: false,
            description: 'Слово не из альтернативы',
        },
        {
            name: 'Множественная альтернатива',
            regex: 'if|else|for|while',
            input: 'for',
            expected: true,
            description: 'Одно из многих ключевых слов',
        },

        // ========== ЗАМЫКАНИЕ КЛИНИ (*) ==========
        {
            name: 'Звездочка - пустая строка',
            regex: 'a*',
            input: '',
            expected: true,
            description: 'Звездочка принимает пустую строку',
        },
        {
            name: 'Звездочка - один символ',
            regex: 'a*',
            input: 'a',
            expected: true,
            description: 'Звездочка принимает один символ',
        },
        {
            name: 'Звездочка - много символов',
            regex: 'a*',
            input: 'aaa',
            expected: true,
            description: 'Звездочка принимает много символов',
        },
        {
            name: 'Звездочка - очень много символов',
            regex: 'a*',
            input: 'aaaaaaa',
            expected: true,
            description: 'Звездочка принимает очень много символов',
        },
        {
            name: 'Звездочка - неправильный символ',
            regex: 'a*',
            input: 'b',
            expected: false,
            description: 'Звездочка не принимает неправильный символ',
        },
        {
            name: 'Звездочка - смешанные символы',
            regex: 'a*',
            input: 'ab',
            expected: false,
            description: 'Звездочка не принимает смешанные символы',
        },

        // ========== ПЛЮС (+) ==========
        {
            name: 'Плюс - пустая строка',
            regex: 'a+',
            input: '',
            expected: false,
            description: 'Плюс не принимает пустую строку',
        },
        {
            name: 'Плюс - один символ',
            regex: 'a+',
            input: 'a',
            expected: true,
            description: 'Плюс принимает один символ',
        },
        {
            name: 'Плюс - много символов',
            regex: 'a+',
            input: 'aaa',
            expected: true,
            description: 'Плюс принимает много символов',
        },
        {
            name: 'Плюс - неправильный символ',
            regex: 'a+',
            input: 'b',
            expected: false,
            description: 'Плюс не принимает неправильный символ',
        },
        {
            name: 'Плюс - смешанные символы',
            regex: 'a+',
            input: 'aab',
            expected: false,
            description: 'Плюс не принимает смешанные символы',
        },

        // ========== ВОПРОС (?) ==========
        {
            name: 'Вопрос - пустая строка',
            regex: 'a?',
            input: '',
            expected: true,
            description: 'Вопрос принимает пустую строку',
        },
        {
            name: 'Вопрос - один символ',
            regex: 'a?',
            input: 'a',
            expected: true,
            description: 'Вопрос принимает один символ',
        },
        {
            name: 'Вопрос - два символа',
            regex: 'a?',
            input: 'aa',
            expected: false,
            description: 'Вопрос не принимает два символа',
        },
        {
            name: 'Вопрос - неправильный символ',
            regex: 'a?',
            input: 'b',
            expected: false,
            description: 'Вопрос не принимает неправильный символ',
        },
        {
            name: 'Вопрос в слове - с символом',
            regex: 'colou?r',
            input: 'colour',
            expected: true,
            description: 'Опциональный символ присутствует',
        },
        {
            name: 'Вопрос в слове - без символа',
            regex: 'colou?r',
            input: 'color',
            expected: true,
            description: 'Опциональный символ отсутствует',
        },

        // ========== ГРУППЫ ==========
        {
            name: 'Простая группа',
            regex: '(abc)',
            input: 'abc',
            expected: true,
            description: 'Группа работает как обычная последовательность',
        },
        {
            name: 'Группа с альтернативой',
            regex: '(a|b)',
            input: 'a',
            expected: true,
            description: 'Альтернатива внутри группы',
        },
        {
            name: 'Группа с квантификатором',
            regex: '(ab)+',
            input: 'ab',
            expected: true,
            description: 'Группа с плюсом - одно повторение',
        },
        {
            name: 'Группа с квантификатором - много повторений',
            regex: '(ab)+',
            input: 'abab',
            expected: true,
            description: 'Группа с плюсом - много повторений',
        },
        {
            name: 'Группа с квантификатором - пустая строка',
            regex: '(ab)+',
            input: '',
            expected: false,
            description: 'Группа с плюсом не принимает пустую строку',
        },
        {
            name: 'Сложная группа',
            regex: '(a|b)*c',
            input: 'aaabbbaaac',
            expected: true,
            description: 'Сложная группа с альтернативой и звездочкой',
        },

        // ========== СИМВОЛЬНЫЕ КЛАССЫ ==========
        {
            name: 'Простой класс - совпадение a',
            regex: '[abc]',
            input: 'a',
            expected: true,
            description: 'Символ из класса',
        },
        {
            name: 'Простой класс - совпадение b',
            regex: '[abc]',
            input: 'b',
            expected: true,
            description: 'Другой символ из класса',
        },
        {
            name: 'Простой класс - совпадение c',
            regex: '[abc]',
            input: 'c',
            expected: true,
            description: 'Третий символ из класса',
        },
        {
            name: 'Простой класс - несовпадение',
            regex: '[abc]',
            input: 'd',
            expected: false,
            description: 'Символ не из класса',
        },
        {
            name: 'Диапазон букв - начало',
            regex: '[a-z]',
            input: 'a',
            expected: true,
            description: 'Начало диапазона',
        },
        {
            name: 'Диапазон букв - середина',
            regex: '[a-z]',
            input: 'm',
            expected: true,
            description: 'Середина диапазона',
        },
        {
            name: 'Диапазон букв - конец',
            regex: '[a-z]',
            input: 'z',
            expected: true,
            description: 'Конец диапазона',
        },
        {
            name: 'Диапазон букв - заглавная',
            regex: '[a-z]',
            input: 'A',
            expected: false,
            description: 'Заглавная буква не в диапазоне',
        },
        {
            name: 'Диапазон цифр',
            regex: '[0-9]',
            input: '5',
            expected: true,
            description: 'Цифра в диапазоне',
        },
        {
            name: 'Диапазон цифр - буква',
            regex: '[0-9]',
            input: 'a',
            expected: false,
            description: 'Буква не в диапазоне цифр',
        },
        {
            name: 'Отрицательный класс - исключенный символ',
            regex: '[^abc]',
            input: 'a',
            expected: false,
            description: 'Исключенный символ',
        },
        {
            name: 'Отрицательный класс - разрешенный символ',
            regex: '[^abc]',
            input: 'd',
            expected: true,
            description: 'Символ не в исключениях',
        },

        // ========== ЭКРАНИРОВАНИЕ ==========
        {
            name: 'Цифры \\d - цифра',
            regex: '\\d',
            input: '5',
            expected: true,
            description: 'Цифра соответствует \\d',
        },
        {
            name: 'Цифры \\d - буква',
            regex: '\\d',
            input: 'a',
            expected: false,
            description: 'Буква не соответствует \\d',
        },
        {
            name: 'Слово \\w - буква',
            regex: '\\w',
            input: 'a',
            expected: true,
            description: 'Буква соответствует \\w',
        },
        {
            name: 'Слово \\w - цифра',
            regex: '\\w',
            input: '5',
            expected: true,
            description: 'Цифра соответствует \\w',
        },
        {
            name: 'Слово \\w - подчеркивание',
            regex: '\\w',
            input: '_',
            expected: false,
            description: 'Подчеркивание соответствует \\w',
        },
        {
            name: 'Слово \\w - пробел',
            regex: '\\w',
            input: ' ',
            expected: false,
            description: 'Пробел не соответствует \\w',
        },
        {
            name: 'Пробел \\s - пробел',
            regex: '\\s',
            input: ' ',
            expected: true,
            description: 'Пробел соответствует \\s',
        },
        {
            name: 'Пробел \\s - табуляция',
            regex: '\\s',
            input: '\t',
            expected: true,
            description: 'Табуляция соответствует \\s',
        },
        {
            name: 'Пробел \\s - буква',
            regex: '\\s',
            input: 'a',
            expected: false,
            description: 'Буква не соответствует \\s',
        },

        // ========== ТОЧКА ==========
        {
            name: 'Точка - буква',
            regex: '.',
            input: 'a',
            expected: true,
            description: 'Точка соответствует букве',
        },
        {
            name: 'Точка - цифра',
            regex: '.',
            input: '5',
            expected: true,
            description: 'Точка соответствует цифре',
        },
        {
            name: 'Точка - символ',
            regex: '.',
            input: '@',
            expected: true,
            description: 'Точка соответствует символу',
        },
        {
            name: 'Точка - пробел',
            regex: '.',
            input: ' ',
            expected: false,
            description: 'Точка НЕ соответствует пробелу (наша реализация)',
        },
        {
            name: 'Точка - табуляция',
            regex: '.',
            input: '\t',
            expected: false,
            description: 'Точка НЕ соответствует табуляции (наша реализация)',
        },

        // ========== СЛОЖНЫЕ КОМБИНАЦИИ ==========
        {
            name: 'Комбинация операторов - a+b*',
            regex: 'a+b*',
            input: 'a',
            expected: true,
            description: 'Плюс + звездочка: только a',
        },
        {
            name: 'Комбинация операторов - a+b*',
            regex: 'a+b*',
            input: 'aaa',
            expected: true,
            description: 'Плюс + звездочка: много a',
        },
        {
            name: 'Комбинация операторов - a+b*',
            regex: 'a+b*',
            input: 'ab',
            expected: true,
            description: 'Плюс + звездочка: a + b',
        },
        {
            name: 'Комбинация операторов - a+b*',
            regex: 'a+b*',
            input: 'aabbb',
            expected: true,
            description: 'Плюс + звездочка: много a + много b',
        },
        {
            name: 'Комбинация операторов - a+b*',
            regex: 'a+b*',
            input: 'b',
            expected: false,
            description: 'Плюс + звездочка: только b (нет обязательного a)',
        },
        {
            name: 'Сложное выражение - (a|b)*c',
            regex: '(a|b)*c',
            input: 'c',
            expected: true,
            description: 'Группа со звездочкой: только c',
        },
        {
            name: 'Сложное выражение - (a|b)*c',
            regex: '(a|b)*c',
            input: 'ac',
            expected: true,
            description: 'Группа со звездочкой: a + c',
        },
        {
            name: 'Сложное выражение - (a|b)*c',
            regex: '(a|b)*c',
            input: 'bc',
            expected: true,
            description: 'Группа со звездочкой: b + c',
        },
        {
            name: 'Сложное выражение - (a|b)*c',
            regex: '(a|b)*c',
            input: 'ababc',
            expected: true,
            description: 'Группа со звездочкой: много повторений + c',
        },
        {
            name: 'Сложное выражение - (a|b)*c',
            regex: '(a|b)*c',
            input: 'abc',
            expected: true,
            description: 'Группа со звездочкой: смешанные + c',
        },

        // ========== ГРАНИЧНЫЕ СЛУЧАИ ==========
        {
            name: 'Очень длинная строка',
            regex: 'a*',
            input: 'a'.repeat(1000),
            expected: true,
            description: 'Очень длинная строка из одинаковых символов',
        },
        {
            name: 'Сложный регекс с длинной строкой',
            regex: '(a|b)*',
            input: 'ab'.repeat(500),
            expected: true,
            description: 'Сложный регекс с очень длинной строкой',
        },

        // ========== РЕАЛЬНЫЕ ПРИМЕРЫ ==========
        {
            name: 'Email простой - корректный',
            regex: '[a-zA-Z0-9]+@[a-zA-Z0-9]+\\.[a-zA-Z]+',
            input: 'user@example.com',
            expected: true,
            description: 'Простая проверка email',
        },
        {
            name: 'Email простой - без @',
            regex: '[a-zA-Z0-9]+@[a-zA-Z0-9]+\\.[a-zA-Z]+',
            input: 'userexample.com',
            expected: false,
            description: 'Email без символа @',
        },
        {
            name: 'Идентификатор переменной',
            regex: '[a-zA-Z_][a-zA-Z0-9_]*',
            input: 'variable_name123',
            expected: true,
            description: 'Корректное имя переменной',
        },
        {
            name: 'Идентификатор переменной - начинается с цифры',
            regex: '[a-zA-Z_][a-zA-Z0-9_]*',
            input: '123variable',
            expected: false,
            description: 'Некорректное имя переменной (начинается с цифры)',
        },

        // ========== СТРЕСС-ТЕСТЫ ==========
        {
            name: 'Множественные альтернативы',
            regex: 'a|b|c|d|e|f|g|h|i|j',
            input: 'e',
            expected: true,
            description: 'Много альтернатив - совпадение в середине',
        },
        {
            name: 'Глубокая вложенность',
            regex: '((((a))))',
            input: 'a',
            expected: true,
            description: 'Глубоко вложенные группы',
        },
        {
            name: 'Комбинация всех операторов',
            regex: '(a+|b*|c?)+',
            input: 'aaabbbccc',
            expected: true,
            description: 'Все операторы в одном выражении',
        },
    ];

    const total = testCases.length;
    console.log(`🚀 ЗАПУСК ВСЕХ ТЕСТОВ ДКА (${total} штука):`);

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
    runAllDFATests();
}
