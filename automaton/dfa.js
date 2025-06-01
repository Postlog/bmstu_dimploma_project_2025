/**
 * Класс для представления ДКА
 */
class DFA {
    constructor() {
        this.states = [];                    // массив состояний
        this.transitions = {};               // {state: {symbol: state}}
        this.startState = null;
        this.acceptStates = {};              // {state: {priority, style}}
        this.stateCounter = 0;
    }

    static fromNFA(nfa) {
        const dfa = new DFA();

        // Начальное состояние ДКА - ε-замыкание начального состояния НКА
        const startStateSet = nfa.getEpsilonClosure([nfa.startState]);
        const startStateName = stateSetToString(startStateSet);
        const dfaStartState = dfa.createState();
        dfa.setStartState(dfaStartState);

        // Объект для отслеживания соответствия множеств состояний НКА и состояний ДКА
        const stateSetToState = {};
        stateSetToState[startStateName] = dfaStartState;

        // Очередь неисследованных состояний ДКА
        const unmarkedStates = [{ dfaState: dfaStartState, nfaStateSet: startStateSet }];

        // Проверяем, является ли начальное состояние принимающим
        if (isAcceptingStateSet(startStateSet, nfa.acceptStates)) {
            const style = getStyleForStateSet(startStateSet, nfa.acceptStates);
            dfa.addAcceptState(dfaStartState, style);
        }

        // Основной цикл алгоритма
        while (unmarkedStates.length > 0) {
            const current = unmarkedStates.shift();
            const currentDfaState = current.dfaState;
            const currentNfaStateSet = current.nfaStateSet;

            // Получаем все символы из переходов НКА
            const alphabet = getAllSymbols(nfa);

            // Для каждого символа алфавита
            for (const symbol of alphabet) {
                // Вычисляем move(текущее_множество, символ)
                const moveResult = move(nfa, currentNfaStateSet, symbol);

                // Вычисляем ε-замыкание результата
                const nextNfaStateSet = nfa.getEpsilonClosure(moveResult);

                // Если получили пустое множество, пропускаем
                if (nextNfaStateSet.length === 0) {
                    continue;
                }

                const nextStateName = stateSetToString(nextNfaStateSet);

                let nextDfaState;

                // Проверяем, есть ли уже состояние для этого множества
                if (stateSetToState[nextStateName]) {
                    nextDfaState = stateSetToState[nextStateName];
                } else {
                    // Создаем новое состояние ДКА
                    nextDfaState = dfa.createState();
                    stateSetToState[nextStateName] = nextDfaState;

                    // Проверяем, является ли новое состояние принимающим
                    if (isAcceptingStateSet(nextNfaStateSet, nfa.acceptStates)) {
                        const style = getStyleForStateSet(nextNfaStateSet, nfa.acceptStates);
                        dfa.addAcceptState(nextDfaState, style);
                    }

                    // Добавляем в очередь для дальнейшего исследования
                    unmarkedStates.push({
                        dfaState: nextDfaState,
                        nfaStateSet: nextNfaStateSet,
                    });
                }

                // Добавляем переход в ДКА
                dfa.addTransition(currentDfaState, symbol, nextDfaState);
            }
        }

        return dfa;
    }

    /**
     * Создание нового состояния
     */
    createState() {
        const state = this.stateCounter++;
        this.states.push(state);
        return state;
    }

    /**
     * Добавление перехода
     */
    addTransition(fromState, symbol, toState) {
        if (!this.transitions[fromState]) {
            this.transitions[fromState] = {};
        }
        this.transitions[fromState][symbol] = toState;
    }

    /**
     * Установка начального состояния
     */
    setStartState(state) {
        this.startState = state;
    }

    /**
     * Добавление принимающего состояния
     */
    addAcceptState(state, style, priority = 0) {
        this.acceptStates[state] = {style, priority};
    }

    /**
     * Получение следующего состояния по символу
     */
    getNextState(state, symbol) {
        if (this.transitions[state] && this.transitions[state][symbol]) {
            return this.transitions[state][symbol];
        }
        return null;
    }
}

function runDFA(dfa, input) {
    let currentState = dfa.startState;

    // Обрабатываем каждый символ входной строки
    for (const char of input) {
        const nextState = dfa.getNextState(currentState, char);

        // Если нет перехода по данному символу, отклоняем
        if (nextState === null) {
            return false;
        }

        currentState = nextState;
    }

    // Проверяем, находимся ли в принимающем состоянии
    return currentState in dfa.acceptStates;
}

// Вспомогательные функции для преобразования НКА в ДКА

/**
 * Получает все символы из переходов НКА
 */
function getAllSymbols(nfa) {
    const symbols = new Set();

    for (const fromState in nfa.transitions) {
        for (const symbol in nfa.transitions[fromState]) {
            symbols.add(symbol);
        }
    }

    return Array.from(symbols);
}

/**
 * Функция move - вычисляет множество состояний, достижимых из данного множества по символу
 */
function move(nfa, states, symbol) {
    const result = new Set();

    for (const state of states) {
        if (nfa.transitions[state] && nfa.transitions[state][symbol]) {
            for (const nextState of nfa.transitions[state][symbol]) {
                result.add(nextState);
            }
        }
    }

    return Array.from(result);
}

/**
 * Проверяет, содержит ли множество состояний НКА принимающие состояния
 */
function isAcceptingStateSet(stateSet, acceptStates) {
    for (const state of stateSet) {
        if (state in acceptStates) {
            return true;
        }
    }
    return false;
}

/**
 * Получает стиль для множества состояний (приоритет по порядку)
 */
function getStyleForStateSet(stateSet, acceptStates) {
    let bestStyle = null;
    let bestPriority = Infinity;

    for (const state of stateSet) {
        if (acceptStates[state]) {
            const styleInfo = acceptStates[state];
            if (styleInfo.priority < bestPriority) {
                bestStyle = styleInfo.style;
                bestPriority = styleInfo.priority;
            }
        }
    }

    return bestStyle;
}

/**
 * Преобразует множество состояний в строку для использования в качестве ключа
 */
function stateSetToString(stateSet) {
    return stateSet.sort().join(',');
}

export { DFA, runDFA };
