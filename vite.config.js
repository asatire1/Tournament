import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base public path
  base: '/',
  
  // Source root
  root: '.',
  
  // Public assets directory
  publicDir: 'public',
  
  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    
    // Generate sourcemaps for debugging
    sourcemap: true,
    
    // Rollup options for multiple entry points
    rollupOptions: {
      input: {
        // Main pages
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        browse: resolve(__dirname, 'browse.html'),
        about: resolve(__dirname, 'about.html'),
        admin: resolve(__dirname, 'admin.html'),
        myAccount: resolve(__dirname, 'my-account.html'),
        competitions: resolve(__dirname, 'competitions.html'),
        
        // Tournament format pages
        americano: resolve(__dirname, 'americano/index.html'),
        mexicano: resolve(__dirname, 'mexicano/index.html'),
        teamLeague: resolve(__dirname, 'team-league/index.html'),
        tournament: resolve(__dirname, 'tournament/index.html'),
      },
      
      output: {
        // Chunk naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        
        // Manual chunks for better caching
        manualChunks: {
          // Core modules
          'core': [
            './src/core/firebase.js',
            './src/core/permissions.js',
            './src/core/storage.js',
            './src/core/router.js',
            './src/core/auth.js',
          ],
          // Services
          'services': [
            './src/services/base-tournament.js',
            './src/services/tournament-service.js',
            './src/services/user-service.js',
          ],
          // UI Components
          'ui': [
            './src/components/ui/Modal.js',
            './src/components/ui/Toast.js',
            './src/components/ui/PlayerBadge.js',
            './src/components/ui/ScoreInput.js',
            './src/components/ui/StandingsTable.js',
            './src/components/ui/MatchCard.js',
            './src/components/ui/Loading.js',
            './src/components/ui/Tabs.js',
          ],
        },
      },
    },
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.log in production for debugging
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
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@services': resolve(__dirname, 'src/services'),
      '@components': resolve(__dirname, 'src/components'),
      '@ui': resolve(__dirname, 'src/components/ui'),
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
