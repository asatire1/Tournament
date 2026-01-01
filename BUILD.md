# UberPadel Build System (Phase 4)

This document explains how to use the Vite-based build system for the UberPadel tournament platform.

## Prerequisites

- Node.js 18+ 
- npm 9+

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
uberpadel/
├── src/
│   ├── core/                 # Core modules (ES modules)
│   │   ├── firebase.esm.js
│   │   ├── permissions.esm.js
│   │   ├── storage.esm.js
│   │   ├── router.esm.js
│   │   ├── auth.esm.js
│   │   └── index.esm.js
│   │
│   ├── services/             # Business logic
│   │   ├── base-tournament.esm.js
│   │   ├── tournament-service.esm.js
│   │   └── index.esm.js
│   │
│   ├── components/ui/        # UI components (ES modules)
│   │   ├── Modal.esm.js
│   │   ├── Toast.esm.js
│   │   ├── PlayerBadge.esm.js
│   │   ├── ScoreInput.esm.js
│   │   ├── StandingsTable.esm.js
│   │   ├── MatchCard.esm.js
│   │   ├── Loading.esm.js
│   │   ├── Tabs.esm.js
│   │   └── index.esm.js
│   │
│   ├── styles/
│   │   └── main.css          # Tailwind CSS entry point
│   │
│   └── main.js               # Application entry point
│
├── americano/                # Americano tournament format
├── mexicano/                 # Mexicano tournament format
├── team-league/              # Team League format
├── tournament/               # Mix Tournament format
│
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
├── package.json              # npm configuration
└── .env.example              # Environment variables template
```

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run clean` | Remove dist folder |

## Development

### Starting the Dev Server

```bash
npm run dev
```

This starts a development server at `http://localhost:3000` with:
- Hot Module Replacement (HMR)
- Fast refresh
- Source maps
- Auto-open browser

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Available variables:

| Variable | Description |
|----------|-------------|
| `UBER_FIREBASE_API_KEY` | Firebase API key |
| `UBER_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `UBER_FIREBASE_DATABASE_URL` | Firebase Realtime Database URL |
| `UBER_FIREBASE_PROJECT_ID` | Firebase project ID |
| `UBER_DEBUG` | Enable debug logging |

Access in code:
```javascript
const apiKey = import.meta.env.UBER_FIREBASE_API_KEY;
```

## Building for Production

```bash
npm run build
```

This creates optimized files in `dist/`:

```
dist/
├── assets/
│   ├── js/
│   │   ├── core-[hash].js      # Core modules chunk
│   │   ├── services-[hash].js  # Services chunk
│   │   ├── ui-[hash].js        # UI components chunk
│   │   └── main-[hash].js      # Entry points
│   └── css/
│       └── main-[hash].css     # Compiled Tailwind CSS
├── index.html
├── americano/index.html
├── mexicano/index.html
└── ...
```

### Build Features

- **Code Splitting**: Core, services, and UI are separate chunks
- **Tree Shaking**: Unused code is removed
- **Minification**: JavaScript and CSS are minified
- **Source Maps**: Generated for debugging
- **Asset Hashing**: Cache busting via content hashes

## Importing Modules

### ES Module Imports

```javascript
// Import from core
import { Firebase, Auth, Permissions } from '@core/index.esm.js';

// Import UI components
import { Modal, Toast, PlayerBadge } from '@ui/index.esm.js';

// Import services
import { TournamentService } from '@services/index.esm.js';
```

### Path Aliases

Configured in `vite.config.js`:

| Alias | Path |
|-------|------|
| `@` | `src/` |
| `@core` | `src/core/` |
| `@services` | `src/services/` |
| `@components` | `src/components/` |
| `@ui` | `src/components/ui/` |

## CSS / Tailwind

### Adding Custom Styles

Edit `src/styles/main.css`:

```css
@layer components {
    .my-custom-class {
        @apply px-4 py-2 bg-blue-500 text-white rounded-xl;
    }
}
```

### Tailwind Configuration

Edit `tailwind.config.js` to:
- Add custom colors
- Extend theme
- Configure plugins
- Safelist dynamic classes

### Custom UberPadel Colors

```css
/* Available in Tailwind */
.text-uber-500    /* Primary brand red */
.bg-padel-500     /* Padel green */
```

## Dual-Mode Support

The codebase supports both:

1. **ES Modules** (Vite build) - Use `*.esm.js` files
2. **Script Tags** (Legacy) - Use original `*.js` files

### For New Features

Create both versions:
- `feature.js` - Script tag version with `window.Feature = ...`
- `feature.esm.js` - ES module version with `export const Feature = ...`

### Migration Path

1. Use existing script-tag versions unchanged
2. Gradually add ES module versions
3. Switch to Vite build when ready
4. Remove legacy versions eventually

## Troubleshooting

### "Module not found" errors

Ensure the file exists and path is correct. Check aliases in `vite.config.js`.

### Tailwind classes not working

1. Check `tailwind.config.js` content paths include your files
2. Add dynamic classes to safelist
3. Run `npm run build` to regenerate CSS

### Firebase not initialized

Ensure Firebase SDK is loaded before your code:
```html
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-auth-compat.js"></script>
```

### Hot reload not working

1. Check terminal for errors
2. Clear browser cache
3. Restart dev server

## Deployment

### Static Hosting (GitHub Pages, Netlify, Vercel)

```bash
npm run build
# Deploy contents of dist/ folder
```

### With Base Path

If deploying to a subdirectory, update `vite.config.js`:

```javascript
export default defineConfig({
    base: '/your-subdirectory/',
    // ...
});
```

## Performance Tips

1. **Lazy load** tournament formats:
   ```javascript
   const AmericanoModule = await import('./americano/main.js');
   ```

2. **Preload** critical chunks:
   ```html
   <link rel="modulepreload" href="/assets/js/core-xxx.js">
   ```

3. **Use production build** for performance testing:
   ```bash
   npm run build && npm run preview
   ```

## Further Reading

- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [ES Modules Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
