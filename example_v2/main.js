import { NFA } from '../automaton/nfa.js';
import { DFA } from '../automaton/dfa.js';
import { MealyMachine } from '../automaton/mealy.js';
import { buildTree } from '../tree/tree.js';

import { Editor } from './editor.js';
import { RULES } from './rules.js';
import { CODE_SAMPLES } from './code-samples.js';

// Глобальные переменные для хранения текущего состояния
let currentLanguage = 'JavaScript';
let editor = null;
let mealy = null;

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
    const editorElement = document.getElementById('editor');
    const hiddenInputElement = document.getElementById('hidden-input');

    // Создаем автомат для выбранного языка
    mealy = createAutomaton(currentLanguage);

    // Создаем пустое дерево
    const tree = buildTree(mealy, null);

    // Создаем редактор
    editor = new Editor(editorElement, hiddenInputElement);
    editor.init(mealy, tree);

    window.editor = editor;
    window.tree = tree;

    // Заполняем список примеров кода
    populateCodeSamples();
}

/**
 * Заполнение списка примеров кода
 */
function populateCodeSamples() {
    const sampleSelect = document.getElementById('sample-select');
    const samples = CODE_SAMPLES[currentLanguage] || [];

    // Очищаем существующие опции (кроме первой - "Empty")
    while (sampleSelect.options.length > 1) {
        sampleSelect.remove(1);
    }

    // Добавляем опции для каждого примера
    samples.forEach((sample, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = sample.name;
        sampleSelect.appendChild(option);
    });
}

/**
 * Обработка изменения языка
 */
function handleLanguageChange(event) {
    currentLanguage = event.target.value;

    // Пересоздаем автомат
    mealy = createAutomaton(currentLanguage);

    // Создаем новое пустое дерево
    const tree = buildTree(mealy, '');

    // Переинициализируем редактор
    editor.init(mealy, tree);

    // Обновляем список примеров
    populateCodeSamples();

    // Сбрасываем выбор примера
    document.getElementById('sample-select').value = '';
}

/**
 * Обработка выбора примера кода
 */
function handleSampleChange(event) {
    const sampleIndex = event.target.value;

    if (sampleIndex === '') {
        // Выбран "Empty" - очищаем редактор
        editor.setText('');
        return;
    }

    const samples = CODE_SAMPLES[currentLanguage] || [];
    const sample = samples[parseInt(sampleIndex)];

    if (sample) {
        editor.setText(sample.code);
    }
}

/**
 * Инициализация приложения
 */
function init() {
    // Инициализируем редактор
    initEditor();

    // Устанавливаем обработчики событий
    document.getElementById('language-select').addEventListener('change', handleLanguageChange);
    document.getElementById('sample-select').addEventListener('change', handleSampleChange);

    // Фокусируемся на редакторе
    document.getElementById('editor').click();
}

// Запускаем инициализацию после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
