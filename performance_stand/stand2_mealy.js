import { NFA } from '../automaton/nfa.js';
import { DFA } from '../automaton/dfa.js';
import { MealyMachine, runMealy } from '../automaton/mealy.js';

import { languages } from './rules_converter.js';

/**
 * Стенд 2: Раскраска с помощью автомата Мили
 */
export class MealyHighlighter {
    constructor(language) {
        const rules = languages[language];
        if (!rules) {
            throw new Error(`Language ${language} not found`);
        }

        const startBuild = performance.now();

        // Создаем НКА для каждого правила
        const nfas = [];
        for (const rule of rules) {
            const nfa = NFA.fromRegex(rule.regex, rule.style);
            nfas.push(nfa);
        }

        // Объединяем все НКА
        const combinedNFA = NFA.union(nfas);

        // Детерминизируем
        const dfa = DFA.fromNFA(combinedNFA);

        // Преобразуем в автомат Мили
        this.mealy = MealyMachine.fromDFA(dfa);

        this.buildTime = performance.now() - startBuild;
    }

    /**
     * Раскрашивает весь текст
     * @param {string} text - текст для раскраски
     * @returns {Array} массив токенов [{start, end, style}]
     */
    highlight(text) {
        return runMealy(this.mealy, text);
    }

    /**
     * Обновляет раскраску при изменении текста
     * В этом подходе также перекрашиваем весь текст заново
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
        let size = 0;

        // Размер таблицы переходов
        const states = this.mealy.allStates.length;
        const symbols = 256; // Предполагаем ASCII

        // Таблица переходов: states * symbols * sizeof(int)
        size += states * symbols * 4;

        // Информация о принимающих состояниях
        size += Object.keys(this.mealy.acceptStates).length * 100;

        return size;
    }

    /**
     * Возвращает время построения автомата
     */
    getBuildTime() {
        return this.buildTime;
    }
}
 