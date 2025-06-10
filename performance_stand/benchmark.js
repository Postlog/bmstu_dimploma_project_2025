import { RegexHighlighter } from './stand1_regex.js';
import { MealyHighlighter } from './stand2_mealy.js';
import { RopeHighlighter } from './stand3_rope.js';

/**
 * Генерирует тестовый код заданной длины
 */
function generateTestCode(lines) {
    const templates = [
        'function test%d() {',
        '    const value = %d;',
        '    // This is a comment for line %d',
        '    if (value > %d) {',
        '        console.log("Value is: " + value);',
        '        return true;',
        '    }',
        '    return false;',
        '}',
        '',
        'class MyClass%d {',
        '    constructor() {',
        '        this.field = %d;',
        '    }',
        '    ',
        '    method%d() {',
        '        /* Multi-line comment',
        '           continues here */',
        '        const str = "string literal %d";',
        '        return this.field + %d;',
        '    }',
        '}',
        '',
    ];

    const result = [];
    let templateIndex = 0;

    for (let i = 0; i < lines; i++) {
        const template = templates[templateIndex % templates.length];
        const line = template.replace(/%d/g, i);
        result.push(line);
        templateIndex++;
    }

    return result.join('\n');
}

/**
 * Генерирует случайные изменения в тексте
 */
function generateChanges(text, count) {
    const changes = [];
    const lines = text.split('\n');

    for (let i = 0; i < count; i++) {
        const lineIndex = Math.floor(Math.random() * lines.length);
        const line = lines[lineIndex];
        const charIndex = Math.floor(Math.random() * line.length);

        // Типы изменений: вставка, удаление, замена
        const changeType = Math.floor(Math.random() * 3);

        let newText, changeStart, changeEnd;

        // Вычисляем абсолютную позицию в тексте
        let absolutePos = 0;
        for (let j = 0; j < lineIndex; j++) {
            absolutePos += lines[j].length + 1; // +1 для \n
        }
        absolutePos += charIndex;

        switch (changeType) {
        case 0: // Вставка
            newText = `${text.slice(0, absolutePos)}x${text.slice(absolutePos)}`;
            changeStart = absolutePos;
            changeEnd = absolutePos;
            break;
        case 1: // Удаление
            if (charIndex < line.length) {
                newText = text.slice(0, absolutePos) + text.slice(absolutePos + 1);
                changeStart = absolutePos;
                changeEnd = absolutePos + 1;
            } else {
                continue; // Пропускаем это изменение
            }
            break;
        case 2: // Замена
            if (charIndex < line.length) {
                newText = `${text.slice(0, absolutePos)}y${text.slice(absolutePos + 1)}`;
                changeStart = absolutePos;
                changeEnd = absolutePos + 1;
            } else {
                continue; // Пропускаем это изменение
            }
            break;
        }

        changes.push({ newText, changeStart, changeEnd });
        text = newText; // Обновляем текст для следующего изменения
    }

    return changes;
}

/**
 * Измеряет производительность highlighter'а
 */
async function measurePerformance(HighlighterClass, language, sizes) {
    const results = {
        name: HighlighterClass.name,
        buildTime: 0,
        initialization: [],
        updates: [],
        memory: [],
        latency: [],
        throughput: [],
    };

    // Создаем highlighter и измеряем время построения
    const startBuild = performance.now();
    const highlighter = new HighlighterClass(language);
    results.buildTime = performance.now() - startBuild;

    if (highlighter.getBuildTime) {
        results.buildTime = highlighter.getBuildTime();
    }

    for (const size of sizes) {
        console.log(`Testing ${HighlighterClass.name} with ${size} lines...`);

        const text = generateTestCode(size);
        const changes = generateChanges(text, 100); // 100 изменений

        // Измеряем время инициализации
        const startInit = performance.now();
        highlighter.highlight(text);
        const initTime = performance.now() - startInit;
        results.initialization.push({ size, time: initTime });

        // Измеряем использование памяти
        if (highlighter.getMemoryUsage) {
            const memory = highlighter.getMemoryUsage();
            results.memory.push({ size, memory });
        }

        // Измеряем время обновлений
        const updateTimes = [];
        let currentText = text;

        for (const change of changes) {
            const startUpdate = performance.now();
            highlighter.update(change.newText, change.changeStart, change.changeEnd);
            const updateTime = performance.now() - startUpdate;
            updateTimes.push(updateTime);
            currentText = change.newText;
        }

        const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
        const minUpdateTime = Math.min(...updateTimes);
        const maxUpdateTime = Math.max(...updateTimes);

        results.updates.push({
            size,
            avg: avgUpdateTime,
            min: minUpdateTime,
            max: maxUpdateTime,
        });

        // Измеряем латентность (время на одно изменение)
        results.latency.push({ size, latency: minUpdateTime });

        // Измеряем пропускную способность (изменений в секунду)
        const throughput = 1000 / avgUpdateTime;
        results.throughput.push({ size, throughput });

        // Собираем дополнительную статистику для Rope
        if (highlighter.getTreeStats) {
            const stats = highlighter.getTreeStats();
            if (!results.treeStats) {results.treeStats = [];}
            results.treeStats.push({ size, ...stats });
        }
    }

    return results;
}

/**
 * Запускает все бенчмарки
 */
export async function runBenchmarks(language = 'Go', sizes = [1000, 5000, 10000, 20000, 50000]) {
    console.log('Starting benchmarks...');
    console.log(`Language: ${language}`);
    console.log(`Sizes: ${sizes.join(', ')} lines`);
    console.log('');

    const results = [];

    // Тестируем каждый highlighter
    for (const HighlighterClass of [RegexHighlighter, MealyHighlighter]) {
        try {
            const result = await measurePerformance(HighlighterClass, language, sizes);
            results.push(result);
        } catch (error) {
            console.error(`Error testing ${HighlighterClass.name}:`, error);
        }
    }

    return results;
}

// Если запускаем напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
    runBenchmarks().then(results => {
        console.log('\nResults:');
        console.log(JSON.stringify(results, null, 2));
    });
}
