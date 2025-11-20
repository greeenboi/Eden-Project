import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersProject(() => {
  return {
    test: {
      globals: true,
      environment: 'node',
      include: ['src/tests/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*.ts'],
        exclude: [
          'src/tests/**',
          'src/**/*.test.ts',
          'src/schema.ts',
          'src/renderer.tsx',
        ],
      },
      poolOptions: {
        workers: { 
          wrangler: { configPath: './wrangler.jsonc' },
          miniflare: {
            compatibilityDate: '2025-01-01',
            compatibilityFlags: ['nodejs_compat'],
          },
        },
      },
    },
  }
})