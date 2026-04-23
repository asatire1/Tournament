/**
 * shared/staging-banner.js — shows a TEST-ENVIRONMENT banner on test.* hosts
 *
 * Runs as a tiny side-effect on every page it's included on. Detects the
 * environment by hostname (no build-time magic needed) and inserts a
 * fixed yellow banner at the top of the page with a minimal inline
 * stylesheet. No dependencies.
 *
 * To opt out on a specific page, set window.__HIDE_STAGING_BANNER = true
 * before this script runs.
 */

(function () {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.__HIDE_STAGING_BANNER) return;

    const host = (window.location.hostname || '').toLowerCase();
    const isTest =
        host === 'test.uberpadel.com' ||
        host === 'www.test.uberpadel.com' ||
        host.startsWith('test.') ||
        host.endsWith('.uberpadel-test.pages.dev') ||
        host === 'uberpadel-test.pages.dev';

    if (!isTest) return;

    function insert() {
        if (document.getElementById('staging-banner')) return;
        const el = document.createElement('div');
        el.id = 'staging-banner';
        el.setAttribute('role', 'status');
        el.innerHTML = `
            <style>
              #staging-banner {
                position: sticky; top: 0; left: 0; right: 0; z-index: 10000;
                background: #fde68a; color: #78350f; border-bottom: 1px solid #f59e0b;
                font: 13px/1.4 system-ui, -apple-system, 'Segoe UI', Inter, sans-serif;
                padding: 8px 14px; text-align: center;
              }
              #staging-banner strong { color: #7c2d12; }
              #staging-banner a { color: #1e3a8a; text-decoration: underline; }
            </style>
            <strong>🚧 Test environment</strong> — this is <code>test.uberpadel.com</code>.
            Data here is shared with production, so keep test tournaments clearly labelled.
            Use Stripe test cards only.
            Switch to live site: <a href="https://uberpadel.com">uberpadel.com</a>
        `;
        if (document.body) {
            document.body.insertBefore(el, document.body.firstChild);
        } else {
            document.addEventListener('DOMContentLoaded', () =>
                document.body.insertBefore(el, document.body.firstChild));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insert);
    } else {
        insert();
    }
})();
