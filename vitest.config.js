import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        // Run in Node (no DOM needed for engine tests)
        environment: 'node',

        // Test file patterns
        include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],

        // Coverage
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/core/engines/**', 'src/services/**', 'src/core/router.js'],
            exclude: ['src/core/firebase.js', 'src/core/error-tracking.js'],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 60
            }
        },

        // Timeout for async tests
        testTimeout: 10000
    },

    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@core': resolve(__dirname, 'src/core'),
            '@engines': resolve(__dirname, 'src/core/engines')
        }
    }
});
