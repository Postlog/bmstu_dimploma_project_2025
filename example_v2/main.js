import { NFA } from '../automaton/nfa.js';
import { DFA } from '../automaton/dfa.js';
import { MealyMachine } from '../automaton/mealy.js';
import { buildTree } from '../tree/tree.js';

import { Editor } from './editor.js';
import RULES from './rules.js';

let editor = null;

/**
 * Создание автомата для выбранного языка
 */
function createAutomaton(language) {
    const rules = RULES[language];
    if (!rules) {
        console.error(`No rules defined for language: ${language}`);
        return null;
    }

    // Создаем НКА для каждого правила
    const nfas = rules.map(rule => {
        const nfa = NFA.fromRegex(rule.Regex, rule.Name);
        return nfa;
    });

    // Объединяем все НКА в один
    const combinedNFA = NFA.union(nfas);

    // Преобразуем НКА в ДКА
    const dfa = DFA.fromNFA(combinedNFA);

    // Преобразуем ДКА в автомат Мили
    return MealyMachine.fromDFA(dfa);
}

/**
 * Инициализация редактора
 */
function initEditor() {
    const languageSelect = document.getElementById('language-select');
    const languages = Object.keys(RULES);

    languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        languageSelect.appendChild(option);
    });

    if (languages.length === 0) {
        languageSelect.disabled = true;
        return;
    }

    const currentLanguage = languages[0];
    languageSelect.value = currentLanguage;

    const editorElement = document.getElementById('editor');

    // Создаем автомат для выбранного языка
    const mealy = createAutomaton(currentLanguage);

    // Создаем пустое дерево
    const tree = buildTree(mealy, null);

    // Создаем редактор
    editor = new Editor(editorElement, null);
    editor.init(mealy, tree);

    window.editor = editor;
    window.tree = tree;

    languageSelect.addEventListener('change', handleLanguageChange);
}

function handleLanguageChange(event) {
    const currentLanguage = event.target.value;

    // Пересоздаем автомат
    const mealy = createAutomaton(currentLanguage);

    // Создаем новое пустое дерево
    const tree = buildTree(mealy, editor.tree.root.getText());

    // Переинициализируем редактор
    editor.init(mealy, tree);
}

/**
 * Инициализация приложения
 */
function init() {
    // Инициализируем редактор
    initEditor();
}

document.addEventListener('DOMContentLoaded', init);
