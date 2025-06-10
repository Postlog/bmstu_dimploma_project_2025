import { saveReport } from './report_generator.js';

/**
 * Главный файл для запуска тестов производительности
 */

// Конфигурация тестов
const config = {
    // Язык для тестирования (должен быть в rules.js)
    language: 'Go',
    
    // Размеры тестов (количество строк)
    sizes: [1000, 5000, 10000, 20000, 50000],
    
    // Имя файла отчета
    reportFile: 'performance_report.html'
};

// Парсим аргументы командной строки
const args = process.argv.slice(2);
if (args.length > 0) {
    // Первый аргумент - язык
    config.language = args[0];
}
if (args.length > 1) {
    // Второй аргумент - размеры через запятую
    config.sizes = args[1].split(',').map(s => parseInt(s));
}

console.log('Performance Testing Configuration:');
console.log(`Language: ${config.language}`);
console.log(`Test sizes: ${config.sizes.join(', ')} lines`);
console.log(`Report file: ${config.reportFile}`);
console.log('');

// Запускаем тесты и генерируем отчет
console.time('Total test time');

saveReport(config.reportFile, config.language, config.sizes)
    .then(() => {
        console.timeEnd('Total test time');
        console.log(`\nReport successfully generated: ${config.reportFile}`);
        console.log('Open the file in a web browser to view the results.');
    })
    .catch(error => {
        console.error('Error during testing:', error);
        process.exit(1);
    }); 