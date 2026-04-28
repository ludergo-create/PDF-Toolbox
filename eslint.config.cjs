const globals = require('globals');

module.exports = [
    {
        ignores: ['js/vendor/**/*.js']
    },
    {
        files: ['scripts/**/*.cjs', 'eslint.config.cjs'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'script',
            globals: {
                ...globals.node
            }
        },
        rules: {
            'eqeqeq': ['error', 'always'],
            'no-undef': 'error',
            'no-unused-vars': 'warn',
            'prefer-const': 'warn'
        }
    },
    {
        files: ['js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                PDFLib: 'readonly',
                Sortable: 'readonly',
                JSZip: 'readonly',
                pdfjsLib: 'readonly',
                generateId: 'readonly',
                isPdfFile: 'readonly',
                isImageFile: 'readonly',
                isJpegFile: 'readonly',
                isPngFile: 'readonly',
                triggerDownload: 'readonly',
                createModalFocusManager: 'readonly',
                safeStorageGet: 'readonly',
                safeStorageSet: 'readonly'
            }
        },
        rules: {
            'eqeqeq': ['error', 'always'],
            'no-undef': 'error',
            'no-unused-vars': 'warn',
            'prefer-const': 'warn'
        }
    }
];
