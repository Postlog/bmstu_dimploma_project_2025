import { RULES } from './rules.js';

/**
 * Преобразует правила из формата RULES в формат для стендов
 * @param {Object} rules - правила в формате RULES
 * @returns {Object} правила в формате для стендов
 */
function convertRules(rules) {
    const converted = {};
    
    for (const [language, languageRules] of Object.entries(rules)) {
        converted[language] = languageRules.map((rule, index) => ({
            regex: rule.Regex.source, // Извлекаем строку регулярного выражения
            style: rule.Name, // Используем имя как стиль
            priority: index, // Приоритет по порядку в массиве
        }));
    }
    
    return converted;
}

// Экспортируем преобразованные правила
export const languages = convertRules(RULES); 