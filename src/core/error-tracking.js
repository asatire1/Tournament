/**
 * error-tracking.js — Global Error Tracking & Sentry Integration
 *
 * Initialises Sentry (if DSN is configured via UBER_SENTRY_DSN env var) and
 * installs global handlers for unhandled promise rejections and uncaught errors.
 *
 * Usage: import and call ErrorTracking.init() as the very first thing in main.js.
 *
 * @module core/error-tracking
 */

// Vite replaces import.meta.env.* at build time. This is safe in an ES module.
const SENTRY_DSN = import.meta.env.UBER_SENTRY_DSN || '';

const ErrorTracking = {
    _initialised: false,
    _sentry: null,

    /**
     * Initialise error tracking.
     * Global handlers are always installed. Sentry loads only if DSN is set.
     */
    async init() {
        if (this._initialised) return;
        this._initialised = true;

        // Install global handlers first — catches errors before Sentry loads
        this._installGlobalHandlers();

        if (SENTRY_DSN) {
            await this._loadSentry(SENTRY_DSN);
        } else {
            console.info('[ErrorTracking] UBER_SENTRY_DSN not set — Sentry disabled.');
        }
    },

    /**
     * Capture an error manually (e.g. from a catch block).
     * @param {Error|string} error
     * @param {object} [context] - Extra data to attach
     */
    captureError(error, context = {}) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[ErrorTracking]', err, context);

        if (this._sentry) {
            this._sentry.withScope(scope => {
                Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
                this._sentry.captureException(err);
            });
        }
    },

    /**
     * Set user context for Sentry breadcrumbs. Call after auth resolves.
     * @param {{ id: string, name: string, email?: string }} user
     */
    setUser(user) {
        if (this._sentry && user) {
            this._sentry.setUser({ id: user.id, username: user.name });
            // Deliberately omit email — avoid sending PII to Sentry
        }
    },

    /** Clear user context on sign-out. */
    clearUser() {
        if (this._sentry) this._sentry.setUser(null);
    },

    // ===== PRIVATE =====

    async _loadSentry(dsn) {
        try {
            // Dynamic import pulls Sentry at runtime (not bundled when DSN is absent)
            const Sentry = await import(
                /* webpackIgnore: true */
                'https://browser.sentry-cdn.com/7.91.0/bundle.tracing.min.js'
            );
            Sentry.init({
                dsn,
                tracesSampleRate: 0.1,
                release: 'uberpadel@2.0.0',
                environment: location.hostname === 'localhost' ? 'development' : 'production',
                beforeSend(event) {
                    // Strip PII before sending
                    if (event.user) {
                        delete event.user.email;
                        delete event.user.ip_address;
                    }
                    return event;
                }
            });
            this._sentry = Sentry;
            console.info('[ErrorTracking] Sentry initialised');
        } catch (err) {
            console.warn('[ErrorTracking] Failed to load Sentry:', err);
        }
    },

    _installGlobalHandlers() {
        // Unhandled promise rejections (Firebase, fetch, etc.)
        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;

            // Firebase permission denials are expected when rules are working correctly
            const isFirebasePermission =
                reason &&
                typeof reason.code === 'string' &&
                reason.code.includes('PERMISSION_DENIED');

            if (isFirebasePermission) {
                console.warn('[ErrorTracking] Firebase permission denied (rules working correctly):', reason.message);
                return;
            }

            console.error('[ErrorTracking] Unhandled rejection:', reason);
            this.captureError(
                reason instanceof Error ? reason : new Error(String(reason)),
                { type: 'unhandledrejection' }
            );
        });

        // Uncaught synchronous errors
        window.onerror = (message, source, lineno, colno, error) => {
            console.error('[ErrorTracking] Uncaught error:', { message, source, lineno, colno });
            if (error) {
                this.captureError(error, { type: 'uncaughterror', source, lineno, colno });
            }
            return false; // Let the browser handle it normally
        };

        // Online / offline feedback
        window.addEventListener('offline', () => {
            if (typeof window.Toast !== 'undefined') {
                window.Toast.warning(
                    'No internet connection — scores will not sync until you reconnect.',
                    { duration: 0, dismissible: true }
                );
            }
        });

        window.addEventListener('online', () => {
            if (typeof window.Toast !== 'undefined') {
                window.Toast.success('Back online — syncing now.');
            }
        });
    }
};

export { ErrorTracking };
