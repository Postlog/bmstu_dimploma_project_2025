import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';

export default [
    js.configs.recommended,
    {
        ignores: [
            'node_modules/',
            '*.min.js',
            'dist/',
            'example/code-samples.js',
            'example/rules.js',
            'example_v2/code-samples.js',
            'example_v2/rules.js',
        ],
    },
    {
        files: ['**/*.{js,mjs,cjs}'],
        plugins: {
            import: importPlugin,
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021,
            },
        },
        rules: {
            // Airbnb base rules (основные правила)
            'indent': ['error', 4],
            'quotes': ['error', 'single'],
            'semi': ['error', 'always'],
            'comma-dangle': ['error', 'always-multiline'],
            'no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],
            'no-console': 'off',
            'prefer-const': 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'prefer-arrow-callback': 'error',
            'arrow-spacing': 'error',
            'prefer-template': 'error',
            'template-curly-spacing': ['error', 'never'],
            'space-before-function-paren': ['error', {
                'anonymous': 'always',
                'named': 'never',
                'asyncArrow': 'always',
            }],
            'keyword-spacing': 'error',
            'space-infix-ops': 'error',
            'eol-last': 'error',
            'no-trailing-spaces': 'error',
            'comma-spacing': ['error', { 'before': false, 'after': true }],
            'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
            'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
            'curly': ['error', 'all'],
            'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 1 }],
            'padded-blocks': ['error', 'never'],

            // Import rules
            'import/order': ['error', {
                'groups': [
                    'builtin',
                    'external',
                    'internal',
                    'parent',
                    'sibling',
                    'index',
                ],
                'newlines-between': 'always',
            }],
            'import/newline-after-import': 'error',
            'import/no-duplicates': 'error',
        },
    },
];
