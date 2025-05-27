/**
 * Глобальная структура с предзаготовленными наборами Unicode символов
 * Инициализируется один раз для избежания повторных вычислений
 * Поддерживает: английский, русский + эмодзи и специальные символы
 */
const UNICODE_CHARS = (() => {
    const chars = {
        // Базовые категории
        digits: new Set(),
        asciiLetters: new Set(),
        whitespace: new Set([' ', '\t', '\n', '\r', '\f', '\v']),
        control: new Set(['\n', '\t', '\r']),

        // Поддерживаемые языки
        cyrillic: new Set(),         // Русский

        // Дополнительные символы (не языки)
        generalPunctuation: new Set(),
        mathOperators: new Set(),
        technicalSymbols: new Set(),
        boxDrawing: new Set(),
        geometricShapes: new Set(),
        miscSymbols: new Set(),
        emojis: new Set(),

        // Готовые комбинации (будут заполнены позже)
        word: new Set(),        // \w - буквы, цифры, подчеркивание
        printable: new Set()    // все печатные символы
    };

    // ASCII цифры (48-57)
    for (let i = 48; i <= 57; i++) {
        chars.digits.add(String.fromCharCode(i));
    }

    // ASCII буквы (65-90, 97-122) - английский
    for (let i = 65; i <= 90; i++) chars.asciiLetters.add(String.fromCharCode(i)); // A-Z
    for (let i = 97; i <= 122; i++) chars.asciiLetters.add(String.fromCharCode(i)); // a-z

    // ASCII печатные символы (32-126)
    for (let i = 32; i <= 126; i++) {
        chars.printable.add(String.fromCharCode(i));
    }

    // Кириллица (1024-1279) - полная поддержка русского
    for (let i = 1024; i <= 1279; i++) {
        const char = String.fromCharCode(i);
        chars.cyrillic.add(char);
        if (/\p{L}/u.test(char)) {
            chars.word.add(char);
        }
    }

    // Общая пунктуация (8192-8303)
    for (let i = 8192; i <= 8303; i++) {
        chars.generalPunctuation.add(String.fromCharCode(i));
    }

    // Математические операторы (8704-8959)
    for (let i = 8704; i <= 8959; i++) {
        chars.mathOperators.add(String.fromCharCode(i));
    }

    // Разные технические символы (8960-9215)
    for (let i = 8960; i <= 9215; i++) {
        chars.technicalSymbols.add(String.fromCharCode(i));
    }

    // Символы для рисования рамок (9472-9599)
    for (let i = 9472; i <= 9599; i++) {
        chars.boxDrawing.add(String.fromCharCode(i));
    }

    // Геометрические фигуры (9632-9727)
    for (let i = 9632; i <= 9727; i++) {
        chars.geometricShapes.add(String.fromCharCode(i));
    }

    // Разные символы (9728-9983)
    for (let i = 9728; i <= 9983; i++) {
        chars.miscSymbols.add(String.fromCharCode(i));
    }

    // Эмодзи (образцы основных блоков)
    const emojiRanges = [
        [0x1F600, 0x1F64F], // Emoticons
        [0x1F300, 0x1F5FF], // Misc Symbols and Pictographs
        [0x1F680, 0x1F6FF], // Transport and Map
        [0x2600, 0x26FF],   // Misc symbols
        [0x2700, 0x27BF],   // Dingbats
    ];

    for (const [start, end] of emojiRanges) {
        for (let i = start; i <= Math.min(end, start + 255); i++) { // Ограничиваем для производительности
            try {
                chars.emojis.add(String.fromCodePoint(i));
            } catch (e) {
                // Игнорируем недопустимые code points
            }
        }
    }

    // Формируем комбинированные наборы

    // \w = ASCII буквы + цифры + кириллица (без подчеркивания)
    for (const char of chars.asciiLetters) chars.word.add(char);
    for (const char of chars.digits) chars.word.add(char);
    // Кириллица уже добавлена выше

    // Все печатные символы
    for (const char of chars.asciiLetters) chars.printable.add(char);
    for (const char of chars.digits) chars.printable.add(char);
    for (const char of chars.control) chars.printable.add(char);
    for (const char of chars.cyrillic) chars.printable.add(char);
    for (const char of chars.generalPunctuation) chars.printable.add(char);
    for (const char of chars.mathOperators) chars.printable.add(char);
    for (const char of chars.technicalSymbols) chars.printable.add(char);
    for (const char of chars.boxDrawing) chars.printable.add(char);
    for (const char of chars.geometricShapes) chars.printable.add(char);
    for (const char of chars.miscSymbols) chars.printable.add(char);
    for (const char of chars.emojis) chars.printable.add(char);

    return chars;
})();

export { UNICODE_CHARS };