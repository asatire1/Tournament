import { defineConfig } from 'vite';
import { resolve }      from 'path';
import { readdirSync, statSync, cpSync, existsSync } from 'fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Source trees loaded through classic `<script src>` tags.
 *
 * Vite only bundles `<script type="module">`. Classic tags are passed through
 * to the built HTML untouched and their targets are never copied, so without
 * this step these files are simply absent from dist/ and every page that
 * references them 404s — silently, because the HTML itself builds fine.
 *
 * Only add a directory here when its scripts are genuinely classic. Anything
 * using `import`/`export` must stay in the module graph instead: served from
 * here it would be untransformed and throw on the first `export`.
 *
 * To check for drift after adding pages, build and then resolve every local
 * `<script src>` in dist/ against dist/ — anything unresolved belongs here.
 */
const CLASSIC_SCRIPT_DIRS = ['account', 'competitions', 'js', 'league', 'quick-play', 'src'];

/**
 * Copy CLASSIC_SCRIPT_DIRS into dist, preserving paths.
 *
 * Runs at closeBundle, after Vite has written the built HTML and copied
 * publicDir. `.html` is filtered out so the unprocessed source pages can never
 * overwrite their built counterparts — those are real entries with injected
 * CSS and hashed asset URLs.
 */
function copyClassicScripts() {
    return {
        name: 'copy-classic-scripts',
        apply: 'build',
        closeBundle() {
            let copied = 0;
            for (const dir of CLASSIC_SCRIPT_DIRS) {
                const from = resolve(__dirname, dir);
                if (!existsSync(from)) continue;
                cpSync(from, resolve(__dirname, 'dist', dir), {
                    recursive: true,
                    filter: src => {
                        if (/\.(html|md)$/i.test(src)) return false;
                        copied++;
                        return true;
                    }
                });
            }
            this.info(`copied ${copied} classic-script paths into dist/`);
        }
    };
}

/**
 * Recursively collect all .html files under `dir`, returning a rollupOptions
 * input map: { camelCaseKey: absolutePath }
 *
 * Excluded: node_modules, dist, .git, src, functions, tests, scripts, og-worker
 * Excluded pages: debug.html, test-*.html, index-*.html (dev artefacts),
 *                 yandex*.html (verification file)
 */
const EXCLUDED_DIRS  = new Set(['node_modules', 'dist', '.git', 'src', 'functions', 'tests', 'scripts', 'og-worker', 'public']);
const EXCLUDED_FILES = /^(debug|test-all|test-core|test-engines|yandex|index-[0-9]|index-new|index-old|create-masjid)/i;

function collectHtmlEntries(dir, root = dir) {
    const entries = {};

    for (const item of readdirSync(dir)) {
        const fullPath = `${dir}/${item}`;
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            if (EXCLUDED_DIRS.has(item)) continue;
            Object.assign(entries, collectHtmlEntries(fullPath, root));
        } else if (item.endsWith('.html') && !EXCLUDED_FILES.test(item)) {
            // Build a unique camelCase key from the relative path
            const rel = fullPath.replace(root + '/', '');
            const key = rel
                .replace(/\.html$/, '')
                .replace(/\/index$/, '')
                .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
                .replace(/^./, c => c.toLowerCase()) || 'main';
            entries[key] = resolve(root, rel);
        }
    }

    return entries;
}

const htmlEntries = collectHtmlEntries(__dirname);

export default defineConfig({
  // Base public path
  base: '/',

  // Source root
  root: '.',

  // Public assets directory
  publicDir: 'public',

  plugins: [copyClassicScripts()],

  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,

    // Generate sourcemaps for debugging
    sourcemap: true,

    // Rollup options for multiple entry points
    rollupOptions: {
      // Automatically include all HTML pages (glob-collected above)
      input: htmlEntries,

      output: {
        // Chunk naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',

        // Manual chunks for better caching
        // Note: these only produce non-empty bundles when the pages that import
        // them use <script type="module"> rather than CDN/legacy script tags.
        manualChunks(id) {
            if (id.includes('src/core/rating-engine'))   return 'rating';
            if (id.includes('src/services/notification')) return 'notifications';
            if (id.includes('src/components/ui/NotificationBell')) return 'notifications';
            if (id.includes('src/services/analytics'))   return 'analytics';
            if (id.includes('src/services/data-export')) return 'gdpr';
            if (id.includes('src/core/firebase') || id.includes('src/core/router') ||
                id.includes('src/core/auth')    || id.includes('src/core/storage')) return 'core';
            if (id.includes('src/services'))             return 'services';
            if (id.includes('src/components/ui'))        return 'ui';
        },
      },
    },

    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // Remove console.log in production builds
        drop_debugger: true,
      },
    },
  },

  // Development server
  server: {
    port: 3000,
    open: true,
    cors: true,

    // Watch for changes
    watch: {
      usePolling: false,
    },
  },

  // Preview server (for testing production builds)
  preview: {
    port: 4173,
    open: true,
  },

  // Resolve aliases
  resolve: {
    alias: {
      '@':            resolve(__dirname, 'src'),
      '@core':        resolve(__dirname, 'src/core'),
      '@services':    resolve(__dirname, 'src/services'),
      '@components':  resolve(__dirname, 'src/components'),
      '@ui':          resolve(__dirname, 'src/components/ui'),
    },
  },

  // CSS configuration
  css: {
    postcss: './postcss.config.js',
  },

  // Environment variables prefix
  envPrefix: 'UBER_',

  // Optimize dependencies
  optimizeDeps: {
    include: [],
    exclude: [],
  },
});
