// @ts-nocheck
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**',
      '**/tests-examples/**',
      '.next/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/password.ts',
        'src/lib/emojis.ts',
        'src/lib/utils.ts',
        'src/app/actions/auth.ts',
        'src/app/actions/event-detail.ts',
        'src/app/dashboard/dashboard-client.tsx',
        'src/app/events/[id]/event-detail-client.tsx',
        'src/app/login/page.tsx',
        'src/components/ui/sidebar.tsx',
        'src/components/ui/role-badge.tsx',
        'src/components/ui/avatar-emoji.tsx',
        'src/components/ui/nav-layout.tsx',
      ],
      exclude: [
        'src/tests/**',
        'src/types/**',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.spec.ts',
        'src/**/*.spec.tsx',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
