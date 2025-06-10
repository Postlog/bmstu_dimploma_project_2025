import { runBenchmarks } from './benchmark.js';

/**
 * Генерирует HTML-отчет с результатами бенчмарков
 */
export async function generateReport(language = 'Go', sizes = [1000, 5000, 10000, 20000, 50000]) {
    console.log('Running benchmarks...');
    const results = await runBenchmarks(language, sizes);
    
    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчет о производительности систем раскраски синтаксиса</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        h1, h2 {
            color: #333;
        }
        .chart-container {
            background-color: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        canvas {
            max-height: 400px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-card h3 {
            margin-top: 0;
            color: #555;
        }
        .download-btn {
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        .download-btn:hover {
            background-color: #45a049;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
        }
        .tree-stats {
            background-color: #e8f4f8;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <h1>Отчет о производительности систем раскраски синтаксиса</h1>
    <p>Язык: <strong>${language}</strong></p>
    <p>Размеры тестов: ${sizes.join(', ')} строк</p>
    <p>Дата: ${new Date().toLocaleString('ru-RU')}</p>
    
    <div class="stats">
        ${results.map(r => `
        <div class="stat-card">
            <h3>${r.name}</h3>
            <p><strong>Время компиляции:</strong> ${r.buildTime.toFixed(2)} мс</p>
            ${r.memory.length > 0 ? `<p><strong>Память (50K строк):</strong> ${(r.memory[r.memory.length - 1].memory / 1024 / 1024).toFixed(2)} МБ</p>` : ''}
            ${r.latency.length > 0 ? `<p><strong>Мин. латентность:</strong> ${Math.min(...r.latency.map(l => l.latency)).toFixed(3)} мс</p>` : ''}
        </div>
        `).join('')}
    </div>
    
    <div class="chart-container">
        <h2>Время инициализации</h2>
        <canvas id="initChart"></canvas>
        <button class="download-btn" onclick="downloadChart('initChart')">Скачать график</button>
    </div>
    
    <div class="chart-container">
        <h2>Среднее время обновления при редактировании</h2>
        <canvas id="updateChart"></canvas>
        <button class="download-btn" onclick="downloadChart('updateChart')">Скачать график</button>
    </div>
    
    <div class="chart-container">
        <h2>Латентность (минимальное время отклика)</h2>
        <canvas id="latencyChart"></canvas>
        <button class="download-btn" onclick="downloadChart('latencyChart')">Скачать график</button>
    </div>
    
    <div class="chart-container">
        <h2>Пропускная способность (изменений/сек)</h2>
        <canvas id="throughputChart"></canvas>
        <button class="download-btn" onclick="downloadChart('throughputChart')">Скачать график</button>
    </div>
    
    <div class="chart-container">
        <h2>Использование памяти</h2>
        <canvas id="memoryChart"></canvas>
        <button class="download-btn" onclick="downloadChart('memoryChart')">Скачать график</button>
    </div>
    
    ${results.find(r => r.treeStats) ? `
    <div class="chart-container">
        <h2>Статистика структуры Rope</h2>
        <div class="tree-stats">
            ${results.find(r => r.treeStats).treeStats.map(s => `
            <p><strong>${s.size} строк:</strong> 
                Листьев: ${s.leaves}, 
                Всего узлов: ${s.totalNodes}, 
                Высота: ${s.height}, 
                Ср. размер листа: ${s.avgLeafSize.toFixed(1)} символов
            </p>
            `).join('')}
        </div>
    </div>
    ` : ''}
    
    <div class="chart-container">
        <h2>Детальные результаты</h2>
        <table>
            <thead>
                <tr>
                    <th>Система</th>
                    <th>Размер (строк)</th>
                    <th>Инициализация (мс)</th>
                    <th>Ср. обновление (мс)</th>
                    <th>Мин. обновление (мс)</th>
                    <th>Макс. обновление (мс)</th>
                </tr>
            </thead>
            <tbody>
                ${results.flatMap(r => 
                    r.initialization.map((init, i) => `
                    <tr>
                        <td>${r.name}</td>
                        <td>${init.size}</td>
                        <td>${init.time.toFixed(2)}</td>
                        <td>${r.updates[i].avg.toFixed(3)}</td>
                        <td>${r.updates[i].min.toFixed(3)}</td>
                        <td>${r.updates[i].max.toFixed(3)}</td>
                    </tr>
                    `).join('')
                ).join('')}
            </tbody>
        </table>
    </div>
    
    <script>
        const results = ${JSON.stringify(results)};
        const sizes = ${JSON.stringify(sizes)};
        
        // Функция для скачивания графика
        function downloadChart(chartId) {
            const canvas = document.getElementById(chartId);
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = chartId + '.png';
            link.href = url;
            link.click();
        }
        
        // График инициализации
        new Chart(document.getElementById('initChart'), {
            type: 'line',
            data: {
                labels: sizes,
                datasets: results.map((r, i) => ({
                    label: r.name,
                    data: r.initialization.map(d => d.time),
                    borderColor: ['#FF6384', '#36A2EB', '#FFCE56'][i],
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'][i] + '20',
                    tension: 0.1
                }))
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Время инициализации vs Размер текста'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Количество строк'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Время (мс)'
                        }
                    }
                }
            }
        });
        
        // График обновлений
        new Chart(document.getElementById('updateChart'), {
            type: 'line',
            data: {
                labels: sizes,
                datasets: results.map((r, i) => ({
                    label: r.name,
                    data: r.updates.map(d => d.avg),
                    borderColor: ['#FF6384', '#36A2EB', '#FFCE56'][i],
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'][i] + '20',
                    tension: 0.1
                }))
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Среднее время обновления vs Размер текста'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Количество строк'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Время (мс)'
                        },
                        type: 'logarithmic'
                    }
                }
            }
        });
        
        // График латентности
        new Chart(document.getElementById('latencyChart'), {
            type: 'line',
            data: {
                labels: sizes,
                datasets: results.map((r, i) => ({
                    label: r.name,
                    data: r.latency.map(d => d.latency),
                    borderColor: ['#FF6384', '#36A2EB', '#FFCE56'][i],
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'][i] + '20',
                    tension: 0.1
                }))
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Минимальная латентность vs Размер текста'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Количество строк'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Время (мс)'
                        },
                        type: 'logarithmic'
                    }
                }
            }
        });
        
        // График пропускной способности
        new Chart(document.getElementById('throughputChart'), {
            type: 'line',
            data: {
                labels: sizes,
                datasets: results.map((r, i) => ({
                    label: r.name,
                    data: r.throughput.map(d => d.throughput),
                    borderColor: ['#FF6384', '#36A2EB', '#FFCE56'][i],
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'][i] + '20',
                    tension: 0.1
                }))
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Пропускная способность vs Размер текста'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Количество строк'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Изменений в секунду'
                        },
                        type: 'logarithmic'
                    }
                }
            }
        });
        
        // График памяти
        const memoryData = results.filter(r => r.memory.length > 0);
        if (memoryData.length > 0) {
            new Chart(document.getElementById('memoryChart'), {
                type: 'line',
                data: {
                    labels: sizes,
                    datasets: memoryData.map((r, i) => ({
                        label: r.name,
                        data: r.memory.map(d => d.memory / 1024 / 1024), // В мегабайтах
                        borderColor: ['#FF6384', '#36A2EB', '#FFCE56'][i],
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'][i] + '20',
                        tension: 0.1
                    }))
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Использование памяти vs Размер текста'
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Количество строк'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Память (МБ)'
                            }
                        }
                    }
                }
            });
        }
    </script>
</body>
</html>
    `;
    
    return html;
}

// Сохраняет отчет в файл
export async function saveReport(filename = 'performance_report.html', language = 'Go', sizes = [1000, 5000, 10000, 20000, 50000]) {
    const html = await generateReport(language, sizes);
    
    // В Node.js
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const fs = await import('fs/promises');
        await fs.writeFile(filename, html, 'utf-8');
        console.log(`Report saved to ${filename}`);
    } else {
        // В браузере
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Если запускаем напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
    saveReport();
}
 