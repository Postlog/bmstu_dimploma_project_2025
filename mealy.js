/**
 * Преобразование ДКА в автомат Мили для раскраски синтаксиса
 */

/**
 * Класс для представления автомата Мили
 */
class MealyMachine {
    constructor() {
        this.allStates = [];
        this.transitions = {};  // {state: {symbol: state}}
        this.startState = null;
        this.acceptStates = {}; // принимающие состояния -> стиль {state: style}
    }

    static fromDFA(dfa) {
        const mealy = new MealyMachine();

        for (const state of dfa.states) {
            mealy.addState(state);
        }

        mealy.setStartState(dfa.startState);

        // Сохраняем информацию о принимающих состояниях и их стилях
        for (const acceptState of Object.keys(dfa.acceptStates)) {
            const styleInfo = dfa.acceptStates[acceptState];
            // Извлекаем стиль из объекта с приоритетом
            const style = styleInfo ? styleInfo.style : null;
            mealy.acceptStates[acceptState] = style;
        }

        for (const fromState in dfa.transitions) {
            for (const symbol in dfa.transitions[fromState]) {
                const toState = dfa.transitions[fromState][symbol];
                mealy.addTransition(fromState, symbol, toState);
            }
        }

        return mealy;
    }

    /**
     * Добавление состояния
     */
    addState(state) {
        if (!this.allStates.includes(state)) {
            this.allStates.push(state);
        }
    }

    /**
     * Установка начального состояния
     */
    setStartState(state) {
        this.startState = state;
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
     * Получение следующего состояния по символу
     */
    getNextState(state, symbol) {
        if (this.transitions[state] && this.transitions[state][symbol]) {
            return this.transitions[state][symbol];
        }
        return null;
    }

    /**
     * Получение стиля для состояния (если оно принимающее)
     */
    getStyle(state) {
        if (state in this.acceptStates) {
            return this.acceptStates[state];
        }
        return null;
    }
        
}

function runMealy(mealy, input) {
    const results = [];
    let currentState = mealy.startState;
    let position = 0;

    let lexemeStart = 0;  // начало текущей лексемы

    while (position < input.length) {
        const symbol = input[position];

        const nextState = mealy.getNextState(currentState, symbol);
        const currentStateStyle = mealy.getStyle(currentState);

        
        // Попали в ловушку - завершаем текущую лексему
        if (nextState === null) {
            // Не можем перейти - завершаем текущую лексему если для предыдущего состояния был зафиксирован стиль 
            // (т.е. оно было принимающим)
            if (currentStateStyle !== null) {
                results.push({
                    start: lexemeStart,
                    end: position - 1,
                    style: currentStateStyle
                });
            } else {
                // Сдвигаем позицию только если на предыдщих шагах не было зафиксировано лексемы
                // Таким образом, мы "повторяем" обработку текущего символа, только уже из начального состояние.
                // Если же на предыдущих состояниях лексемы не было зафиксировано, то мы уже в начальном состоянии
                position++
            }

            // Сбрасываем автомат и лексему для поиска следующего токена
            currentState = mealy.startState;
            lexemeStart = position;
            continue;
        }

        // Переходим в следующее состояние
        currentState = nextState;
        
        position++;
    }

    const currentStateStyle = mealy.getStyle(currentState);
    // Обрабатываем незавершенную лексему в конце строки
    if (currentStateStyle !== null && position !== 0) {
        results.push({
            start: lexemeStart,
            end: position - 1,
            style: currentStateStyle
        });
    }

    return results;
}

export { MealyMachine, runMealy };