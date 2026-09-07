import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

export default defineConfig([
    ...nextVitals,
    ...nextTypeScript,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-empty-object-type': 'warn',
            '@typescript-eslint/ban-ts-comment': 'warn',
            'react-hooks/immutability': 'warn',
            'react/no-unescaped-entities': 'warn',
        },
    },
    {
        files: ['**/*.test.{ts,tsx}', 'src/tests/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@next/next/no-img-element': 'off',
        },
    },
    globalIgnores([
        '.next/**',
        '.open-next/**',
        'coverage/**',
        'playwright-report/**',
        'test-results/**',
        'next-env.d.ts',
    ]),
])
