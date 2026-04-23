/**
 * tournaments/js/pair-invite.js — three-mechanism partner invite client
 *
 * Mount via PairInvite.render(container, { tournamentId, onRegistered }).
 * Provides three tabs:
 *   - Paste username     → registerPair callable
 *   - Share link          → createPairClaimLink callable → copy to clipboard
 *   - Email invite        → sendPairInviteEmail callable
 *
 * Requires Firebase Functions SDK loaded.
 */

(function () {

function callable(name) {
    const fns = firebase.app().functions
        ? firebase.app().functions('europe-west1')
        : firebase.functions('europe-west1');
    return fns.httpsCallable(name);
}

const PairInvite = {
    /**
     * Mount into a container.
     * @param {string|HTMLElement} elOrId
     * @param {{tournamentId:string, onRegistered?:(pairId:string)=>void}} opts
     */
    render(elOrId, opts) {
        const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
        if (!el) throw new Error('PairInvite: container not found');
        if (!opts?.tournamentId) throw new Error('tournamentId required');

        const state = { tab: 'paste', opts, busy: false, message: null, messageType: null };

        function render() {
            el.innerHTML = `
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div class="mb-4 flex gap-2 border-b border-gray-100">
                        <button data-tab="paste"
                            class="pb-2 px-2 text-sm font-semibold ${state.tab==='paste'?'text-blue-700 border-b-2 border-blue-600':'text-gray-500 hover:text-gray-800'}">
                            Paste username
                        </button>
                        <button data-tab="link"
                            class="pb-2 px-2 text-sm font-semibold ${state.tab==='link'?'text-blue-700 border-b-2 border-blue-600':'text-gray-500 hover:text-gray-800'}">
                            Share link
                        </button>
                        <button data-tab="email"
                            class="pb-2 px-2 text-sm font-semibold ${state.tab==='email'?'text-blue-700 border-b-2 border-blue-600':'text-gray-500 hover:text-gray-800'}">
                            Email invite
                        </button>
                    </div>
                    <div data-tab-body></div>
                    ${state.message ? `
                        <div class="mt-4 p-3 rounded-lg text-sm ${
                            state.messageType === 'success' ? 'bg-green-50 border border-green-200 text-green-800'
                          : state.messageType === 'error'   ? 'bg-red-50 border border-red-200 text-red-800'
                          : 'bg-blue-50 border border-blue-200 text-blue-800'
                        }">${escapeHtml(state.message)}</div>
                    ` : ''}
                </div>
            `;
            renderTabBody();
            el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
                state.tab = b.dataset.tab;
                state.message = null;
                render();
            }));
        }

        function renderTabBody() {
            const body = el.querySelector('[data-tab-body]');
            if (!body) return;
            if (state.tab === 'paste') {
                body.innerHTML = `
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Partner's Uber Padel username</label>
                    <div class="flex gap-2">
                        <span class="inline-flex items-center px-3 bg-gray-100 text-gray-500 rounded-l-lg border border-r-0 border-gray-200 text-sm">@</span>
                        <input data-input="username" type="text" maxlength="50" placeholder="partner_username"
                            class="flex-1 px-3 py-2.5 border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    <button data-action="paste-submit" ${state.busy?'disabled':''}
                        class="mt-3 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm disabled:bg-gray-300">
                        ${state.busy ? 'Pairing…' : 'Pair with partner'}
                    </button>
                    <p class="text-xs text-gray-500 mt-2">Your partner must already have a verified Uber Padel account.</p>
                `;
            } else if (state.tab === 'link') {
                body.innerHTML = `
                    <p class="text-sm text-gray-600 mb-3">Generate a one-use link you can text to your partner. They open it, sign in, and you're paired.</p>
                    <button data-action="link-create" ${state.busy?'disabled':''}
                        class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm disabled:bg-gray-300">
                        ${state.busy ? 'Creating…' : 'Create invite link'}
                    </button>
                    ${state.claimUrl ? `
                        <div class="mt-3 flex items-center gap-2">
                            <input readonly value="${escapeHtml(state.claimUrl)}" class="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono" />
                            <button data-action="link-copy" class="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">Copy</button>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">Expires in 72 hours. One-time use.</p>
                    ` : ''}
                `;
            } else if (state.tab === 'email') {
                body.innerHTML = `
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Partner's email address</label>
                    <input data-input="email" type="email" placeholder="partner@example.com"
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    <button data-action="email-send" ${state.busy?'disabled':''}
                        class="mt-3 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm disabled:bg-gray-300">
                        ${state.busy ? 'Sending…' : 'Send invite email'}
                    </button>
                    <p class="text-xs text-gray-500 mt-2">If your partner doesn't have an account yet, they'll be walked through signup first.</p>
                `;
            }
        }

        async function submitPaste() {
            const username = el.querySelector('[data-input="username"]').value.trim().replace(/^@/, '');
            if (!username) return setMessage('error', 'Enter a username');
            state.busy = true; state.message = null; render();
            try {
                const res = await callable('registerPair')({
                    tournamentId: state.opts.tournamentId,
                    partnerUsername: username
                });
                state.busy = false;
                setMessage('success', `Paired! You're registered.`);
                if (typeof state.opts.onRegistered === 'function') state.opts.onRegistered((res.data||res).pairId);
            } catch (err) {
                state.busy = false;
                setMessage('error', err?.message || String(err));
            }
        }

        async function createClaim() {
            state.busy = true; state.claimUrl = null; state.message = null; render();
            try {
                const res = await callable('createPairClaimLink')({ tournamentId: state.opts.tournamentId });
                const { token } = res.data || res;
                state.claimUrl = `${window.location.origin}/tournaments/claim-pair.html?claim=${encodeURIComponent(token)}`;
                state.busy = false;
                render();
            } catch (err) {
                state.busy = false;
                setMessage('error', err?.message || String(err));
            }
        }

        async function copyClaim() {
            if (!state.claimUrl) return;
            try {
                await navigator.clipboard.writeText(state.claimUrl);
                setMessage('success', 'Link copied to clipboard.');
            } catch {
                setMessage('info', state.claimUrl);
            }
        }

        async function sendEmail() {
            const email = el.querySelector('[data-input="email"]').value.trim();
            if (!email) return setMessage('error', 'Enter an email address');
            state.busy = true; state.message = null; render();
            try {
                await callable('sendPairInviteEmail')({
                    tournamentId: state.opts.tournamentId,
                    partnerEmail: email
                });
                state.busy = false;
                setMessage('success', `Invite sent to ${email}. Expires in 48 hours.`);
            } catch (err) {
                state.busy = false;
                setMessage('error', err?.message || String(err));
            }
        }

        function setMessage(type, text) {
            state.message = text;
            state.messageType = type;
            render();
        }

        el.addEventListener('click', e => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action === 'paste-submit') submitPaste();
            if (action === 'link-create')  createClaim();
            if (action === 'link-copy')    copyClaim();
            if (action === 'email-send')   sendEmail();
        });

        render();
    }
};

function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

if (typeof window !== 'undefined') {
    window.PairInvite = PairInvite;
}

})();
