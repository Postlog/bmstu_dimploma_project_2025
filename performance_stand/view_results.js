import { runBenchmarks } from './benchmark.js';

/**
 * Просмотр результатов в консоли с таблицами
 */
async function viewResults() {
    console.log('Running benchmarks...\n');
    const results = await runBenchmarks('Go', [1000, 5000, 10000, 20000, 50000]);
    
    // Вывод сводной информации
    console.log('\n=== СВОДНАЯ ИНФОРМАЦИЯ ===\n');
    for (const result of results) {
        console.log(`${result.name}:`);
        console.log(`  Время компиляции: ${result.buildTime.toFixed(2)} мс`);
        if (result.memory.length > 0) {
            const lastMemory = result.memory[result.memory.length - 1];
            console.log(`  Память (${lastMemory.size} строк): ${(lastMemory.memory / 1024 / 1024).toFixed(2)} МБ`);
        }
        console.log('');
    }
    
    // Таблица времени инициализации
    console.log('\n=== ВРЕМЯ ИНИЦИАЛИЗАЦИИ (мс) ===\n');
    console.log('Размер\t\tRegex\t\tMealy\t\tRope');
    console.log('------\t\t-----\t\t-----\t\t----');
    
    const sizes = results[0].initialization.map(i => i.size);
    for (const size of sizes) {
        const row = [];
        for (const result of results) {
            const init = result.initialization.find(i => i.size === size);
            row.push(init ? init.time.toFixed(2) : 'N/A');
        }
        console.log(`${size}\t\t${row.join('\t\t')}`);
    }
    
    // Таблица среднего времени обновления
    console.log('\n=== СРЕДНЕЕ ВРЕМЯ ОБНОВЛЕНИЯ (мс) ===\n');
    console.log('Размер\t\tRegex\t\tMealy\t\tRope');
    console.log('------\t\t-----\t\t-----\t\t----');
    
    for (const size of sizes) {
        const row = [];
        for (const result of results) {
            const update = result.updates.find(u => u.size === size);
            row.push(update ? update.avg.toFixed(3) : 'N/A');
        }
        console.log(`${size}\t\t${row.join('\t\t')}`);
    }
    
    // Таблица латентности
    console.log('\n=== МИНИМАЛЬНАЯ ЛАТЕНТНОСТЬ (мс) ===\n');
    console.log('Размер\t\tRegex\t\tMealy\t\tRope');
    console.log('------\t\t-----\t\t-----\t\t----');
    
    for (const size of sizes) {
        const row = [];
        for (const result of results) {
            const latency = result.latency.find(l => l.size === size);
            row.push(latency ? latency.latency.toFixed(3) : 'N/A');
        }
        console.log(`${size}\t\t${row.join('\t\t')}`);
    }
    
    // Анализ результатов
    console.log('\n=== АНАЛИЗ РЕЗУЛЬТАТОВ ===\n');
    
    // Сравнение времени инициализации
    const lastSize = sizes[sizes.length - 1];
    const initTimes = results.map(r => {
        const init = r.initialization.find(i => i.size === lastSize);
        return { name: r.name, time: init ? init.time : Infinity };
    }).sort((a, b) => a.time - b.time);
    
    console.log(`Лучшее время инициализации (${lastSize} строк): ${initTimes[0].name} (${initTimes[0].time.toFixed(2)} мс)`);
    
    // Сравнение времени обновления
    const updateTimes = results.map(r => {
        const update = r.updates.find(u => u.size === lastSize);
        return { name: r.name, time: update ? update.avg : Infinity };
    }).sort((a, b) => a.time - b.time);
    
    console.log(`Лучшее среднее время обновления (${lastSize} строк): ${updateTimes[0].name} (${updateTimes[0].time.toFixed(3)} мс)`);
    
    // Масштабируемость
    console.log('\n=== МАСШТАБИРУЕМОСТЬ ===');
    console.log('(Отношение времени для 50k строк к времени для 1k строк)\n');
    
    for (const result of results) {
        const init1k = result.initialization.find(i => i.size === 1000);
        const init50k = result.initialization.find(i => i.size === 50000);
        
        if (init1k && init50k) {
            const ratio = init50k.time / init1k.time;
            console.log(`${result.name}: ${ratio.toFixed(1)}x`);
        }
    }
}

// Запускаем просмотр результатов
viewResults().catch(console.error); 