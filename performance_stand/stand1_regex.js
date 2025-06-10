import { languages } from './rules_converter.js';

/**
 * Стенд 1: Раскраска с помощью прямого применения регулярных выражений
 * Подход аналогичный highlight_dynamic.js
 */
export class RegexHighlighter {
    constructor(language) {
        const rules = languages[language];
        if (!rules) {
            throw new Error(`Language ${language} not found`);
        }

        // Компилируем регулярные выражения
        this.patterns = [];
        for (const rule of rules) {
            this.patterns.push({
                regex: new RegExp(rule.regex, 'g'),
                style: rule.style,
                priority: rule.priority || 0,
            });
        }

        // Сортируем по приоритету
        this.patterns.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Раскрашивает весь текст
     * @param {string} text - текст для раскраски
     * @returns {Array} массив токенов [{start, end, style}]
     */
    highlight(text) {
        const tokens = [];
        const styleMap = new Map(); // позиция -> стиль

        // Применяем каждое регулярное выражение
        for (const pattern of this.patterns) {
            pattern.regex.lastIndex = 0;
            let match;

            while ((match = pattern.regex.exec(text)) !== null) {
                const start = match.index;
                const end = match.index + match[0].length;

                // Записываем стиль для каждой позиции
                // Приоритет учитывается порядком обработки
                for (let i = start; i < end; i++) {
                    if (!styleMap.has(i)) {
                        styleMap.set(i, pattern.style);
                    }
                }
            }
        }

        // Преобразуем карту позиций в массив токенов
        let currentStart = 0;
        let currentStyle = styleMap.get(0) || null;

        for (let i = 1; i <= text.length; i++) {
            const style = styleMap.get(i) || null;

            if (style !== currentStyle || i === text.length) {
                tokens.push({
                    start: currentStart,
                    end: i,
                    style: currentStyle,
                });
                currentStart = i;
                currentStyle = style;
            }
        }

        return tokens;
    }

    /**
     * Обновляет раскраску при изменении текста
     * В этом подходе просто перекрашиваем весь текст заново
     * @param {string} newText - новый текст
     * @param {number} changeStart - позиция начала изменения
     * @param {number} changeEnd - позиция конца изменения
     * @returns {Array} массив токенов
     */
    update(newText, changeStart, changeEnd) {
        return this.highlight(newText);
    }

    /**
     * Возвращает размер используемой памяти (приблизительно)
     */
    getMemoryUsage() {
        // Приблизительная оценка памяти
        let size = 0;

        // Размер скомпилированных регулярных выражений
        for (const pattern of this.patterns) {
            size += pattern.regex.source.length * 2; // UTF-16
            size += 100; // Overhead для RegExp объекта
        }

        return size;
    }
}
 