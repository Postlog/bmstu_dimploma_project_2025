import { NFA } from '../automaton/nfa.js';
import { DFA } from '../automaton/dfa.js';
import { MealyMachine } from '../automaton/mealy.js';
import { buildTree } from '../tree/tree.js';

import { languages } from './rules_converter.js';

/**
 * Стенд 3: Инкрементальная раскраска с помощью структуры Rope
 */
export class RopeHighlighter {
    constructor(language) {
        const rules = languages[language];
        if (!rules) {
            throw new Error(`Language ${language} not found`);
        }

        const startBuild = performance.now();

        // Создаем автомат Мили (как в стенде 2)
        const nfas = [];
        for (const rule of rules) {
            const nfa = NFA.fromRegex(rule.regex, rule.style);
            nfas.push(nfa);
        }

        const combinedNFA = NFA.union(nfas);
        const dfa = DFA.fromNFA(combinedNFA);
        this.mealy = MealyMachine.fromDFA(dfa);

        this.buildTime = performance.now() - startBuild;

        // Подписчики на изменения
        this.subscribers = new Set();

        // Инициализируем дерево при первом использовании
        this.tree = null;
        this.leaves = [];
    }

    /**
     * Раскрашивает весь текст и строит дерево
     * @param {string} text - текст для раскраски
     * @returns {Array} массив токенов [{start, end, style}]
     */
    highlight(text) {
        // Строим дерево
        const { root, leaves } = buildTree(this.mealy, text);
        this.tree = { root };
        this.leaves = leaves;

        // Настраиваем обработчики для листьев
        this.setupLeafHandlers(leaves);

        // Собираем токены из листьев
        return this.collectTokens();
    }

    /**
     * Настраивает обработчики изменений для листьев
     */
    setupLeafHandlers(leaves) {
        let currentOffset = 0;

        for (const leaf of leaves) {
            const leafStart = currentOffset;
            const leafText = leaf.getText();
            currentOffset += leafText.length;

            leaf.setOnChangeCallback((changeType, args) => {
                // Уведомляем подписчиков об изменении
                const event = {
                    type: changeType,
                    leaf,
                    start: leafStart,
                    end: leafStart + leafText.length,
                    style: leaf.style,
                    args,
                };

                this.notifySubscribers(event);
            });
        }
    }

    /**
     * Обновляет раскраску при изменении текста
     * @param {string} newText - новый текст
     * @param {number} changeStart - позиция начала изменения
     * @param {number} changeEnd - позиция конца изменения
     * @returns {Array} массив токенов
     */
    update(newText, changeStart, changeEnd) {
        if (!this.tree) {
            return this.highlight(newText);
        }

        // Находим листовой узел, содержащий позицию изменения
        let currentOffset = 0;
        let targetLeaf = null;
        let leafOffset = 0;

        for (const leaf of this.leaves) {
            const leafText = leaf.getText();
            const leafEnd = currentOffset + leafText.length;

            if (changeStart >= currentOffset && changeStart <= leafEnd) {
                targetLeaf = leaf;
                leafOffset = currentOffset;
                break;
            }

            currentOffset = leafEnd;
        }

        if (!targetLeaf) {
            // Изменение за пределами текста, перестраиваем дерево
            return this.highlight(newText);
        }

        // Вычисляем новый текст для листа
        const oldLeafText = targetLeaf.getText();
        const relativeStart = changeStart - leafOffset;
        const relativeEnd = Math.min(changeEnd - leafOffset, oldLeafText.length);

        const newLeafText = oldLeafText.slice(0, relativeStart) +
                            newText.slice(changeStart, changeStart + (changeEnd - changeStart)) +
                            oldLeafText.slice(relativeEnd);

        // Обновляем текст листа
        targetLeaf.onTextChange(newLeafText);

        // Обновляем список листьев если они изменились
        this.updateLeavesList();

        // Возвращаем обновленные токены
        return this.collectTokens();
    }

    /**
     * Собирает токены из всех листьев дерева
     */
    collectTokens() {
        const tokens = [];
        let currentOffset = 0;

        // Получаем актуальный список листьев
        const leaves = this.tree.root.leaves();

        for (const leaf of leaves) {
            const text = leaf.getText();
            if (text) {
                tokens.push({
                    start: currentOffset,
                    end: currentOffset + text.length,
                    style: leaf.style,
                });
                currentOffset += text.length;
            }
        }

        return tokens;
    }

    /**
     * Обновляет список листьев после изменений
     */
    updateLeavesList() {
        const newLeaves = this.tree.root.leaves();

        // Настраиваем обработчики для новых листьев
        for (const leaf of newLeaves) {
            if (!this.leaves.includes(leaf)) {
                this.setupLeafHandlers([leaf]);
            }
        }

        this.leaves = newLeaves;
    }

    /**
     * Подписывается на изменения
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    /**
     * Уведомляет подписчиков об изменениях
     */
    notifySubscribers(event) {
        for (const callback of this.subscribers) {
            callback(event);
        }
    }

    /**
     * Возвращает размер используемой памяти (приблизительно)
     */
    getMemoryUsage() {
        let size = 0;

        // Размер автомата Мили
        const states = this.mealy.allStates.length;
        size += states * 256 * 4; // Таблица переходов

        // Размер дерева (приблизительно)
        if (this.tree) {
            const leaves = this.leaves.length;
            const avgLeafSize = 50; // Средний размер текста в листе

            // Листовые узлы
            size += leaves * (avgLeafSize * 2 + 200); // Текст + overhead

            // Внутренние узлы (примерно столько же, сколько листьев)
            size += leaves * 100;

            // Массивы A в узлах
            size += (leaves * 2) * states * 4;
        }

        return size;
    }

    /**
     * Возвращает время построения автомата
     */
    getBuildTime() {
        return this.buildTime;
    }

    /**
     * Возвращает статистику о дереве
     */
    getTreeStats() {
        if (!this.tree) {
            return null;
        }

        const leaves = this.leaves.length;
        const totalNodes = this.countNodes(this.tree.root);
        const height = this.getTreeHeight(this.tree.root);

        return {
            leaves,
            totalNodes,
            height,
            avgLeafSize: this.getTotalText().length / leaves,
        };
    }

    /**
     * Считает общее количество узлов в дереве
     */
    countNodes(node) {
        if (!node) {return 0;}
        if (node.isLeaf()) {return 1;}
        return 1 + this.countNodes(node.left) + this.countNodes(node.right);
    }

    /**
     * Вычисляет высоту дерева
     */
    getTreeHeight(node) {
        if (!node || node.isLeaf()) {return 0;}
        return 1 + Math.max(
            this.getTreeHeight(node.left),
            this.getTreeHeight(node.right),
        );
    }

    /**
     * Получает весь текст из дерева
     */
    getTotalText() {
        return this.tree ? this.tree.root.getText() : '';
    }
}
 