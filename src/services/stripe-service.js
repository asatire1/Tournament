/**
 * src/services/stripe-service.js — Stripe Connect client wrapper
 *
 * Loaded as a classic <script> on pages that need Stripe integration
 * (organiser/payouts.html, later tournaments/detail.html for paid entry
 * in Phase E). Requires the Firebase Functions SDK on the page.
 *
 * Public API (window.StripeService):
 *   startConnectOnboarding()        → { url, accountId }
 *   getConnectStatus()              → { connected, chargesEnabled, ... }
 *   loadStripeJs()                  → lazy-loads @stripe/stripe-js CDN
 *   redirectToCheckout(sessionUrl)  → (Phase E) navigates to Checkout
 */

(function () {

function callable(name) {
    const fns = firebase.app().functions
        ? firebase.app().functions('europe-west1')
        : firebase.functions('europe-west1');
    return fns.httpsCallable(name);
}

const StripeService = {

    /**
     * Kick off the Stripe Connect Express onboarding flow.
     * Returns the URL the browser should be redirected to.
     * @returns {Promise<{url:string, accountId:string, expiresAt:string}>}
     */
    async startConnectOnboarding({ returnUrl, refreshUrl } = {}) {
        const origin = window.location.origin;
        const params = {
            returnUrl:  returnUrl  || `${origin}/organiser/payouts.html?return=success`,
            refreshUrl: refreshUrl || `${origin}/organiser/payouts.html?return=refresh`
        };
        const res = await callable('createConnectOnboardingLink')(params);
        return res.data || res;
    },

    /**
     * Read the current Stripe Connect status for the authenticated user.
     */
    async getConnectStatus() {
        const res = await callable('getConnectAccountStatus')({});
        return res.data || res;
    },

    /**
     * Subscribe to live updates on stripe_accounts/{uid}.
     * Returns an unsubscribe function.
     */
    subscribeStatus(cb) {
        const user = firebase.auth().currentUser;
        if (!user) { cb(null); return () => {}; }
        const ref = firebase.database().ref(`stripe_accounts/${user.uid}`);
        const handler = snap => cb(snap.val());
        ref.on('value', handler);
        return () => ref.off('value', handler);
    },

    /**
     * Lazy-load the Stripe.js library from the CDN.
     * Phase E uses this when redirecting to a Checkout Session.
     * @param {string} publishableKey
     * @returns {Promise<Stripe>} Stripe client instance
     */
    async loadStripeJs(publishableKey) {
        if (window.Stripe) return window.Stripe(publishableKey);
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.async = true;
            script.onload = () => {
                if (window.Stripe) resolve(window.Stripe(publishableKey));
                else reject(new Error('Stripe.js failed to expose window.Stripe'));
            };
            script.onerror = () => reject(new Error('Stripe.js failed to load'));
            document.head.appendChild(script);
        });
    },

    /**
     * Redirect to a Stripe Checkout session (Phase E).
     */
    redirectToCheckout(sessionUrl) {
        if (!sessionUrl) throw new Error('sessionUrl required');
        window.location.assign(sessionUrl);
    }
};

if (typeof window !== 'undefined') {
    window.StripeService = StripeService;
}

})();
