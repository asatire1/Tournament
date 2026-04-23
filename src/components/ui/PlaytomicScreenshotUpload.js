/**
 * src/components/ui/PlaytomicScreenshotUpload.js
 *
 * Reusable screenshot-upload widget used at:
 *   - account/login.html signup step (after email+password)
 *   - account/reverify.html (monthly re-verification)
 *
 * Usage (classic <script> pattern):
 *
 *   <div id="uploader"></div>
 *   <script>
 *     PlaytomicScreenshotUpload.mount('uploader', {
 *       onVerified(result) { ... },
 *       onRejected(failureReason, result) { ... }
 *     });
 *   </script>
 *
 * Requires PlaytomicVerificationService and Firebase Storage SDK on the page.
 */

(function () {

const PlaytomicScreenshotUpload = {
    /**
     * Mount into a container element.
     */
    mount(elOrId, opts = {}) {
        const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
        if (!el) throw new Error('PlaytomicScreenshotUpload: container not found');

        const state = {
            file: null,
            previewUrl: null,
            progress: 0,
            status: 'idle', // idle | uploading | verifying | verified | rejected | error
            failureReason: null,
            extracted: null,
            verificationId: null,
            errorMessage: null,
            opts
        };
        el._playtomicUploadState = state;

        _render(el, state);
        _wire(el, state);
        return {
            getState: () => state,
            reset: () => { _reset(state); _render(el, state); }
        };
    }
};

function _render(el, state) {
    const { status, previewUrl, progress, failureReason, extracted, errorMessage } = state;
    const pct = Math.round(progress * 100);

    const body = (() => {
        switch (status) {
            case 'verified':
                return `
                    <div class="rounded-2xl bg-green-50 border border-green-200 p-5">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-xl">✓</div>
                            <div>
                                <div class="font-semibold text-green-800">Verified</div>
                                <div class="text-sm text-green-700">We've saved your Playtomic profile.</div>
                            </div>
                        </div>
                        <dl class="grid grid-cols-2 gap-2 text-sm mt-3">
                            ${extracted?.extractedName     ? `<div><dt class="text-green-700">Name</dt><dd class="font-medium text-green-900">${_esc(extracted.extractedName)}</dd></div>` : ''}
                            ${extracted?.extractedRating   !== undefined ? `<div><dt class="text-green-700">Rating</dt><dd class="font-medium text-green-900">${extracted.extractedRating}</dd></div>` : ''}
                            ${extracted?.extractedUsername ? `<div class="col-span-2"><dt class="text-green-700">Playtomic</dt><dd class="font-medium text-green-900">@${_esc(extracted.extractedUsername)}</dd></div>` : ''}
                        </dl>
                    </div>
                `;
            case 'rejected':
                return `
                    <div class="rounded-2xl bg-red-50 border border-red-200 p-5">
                        <div class="font-semibold text-red-800 mb-1">We couldn't verify that screenshot</div>
                        <p class="text-sm text-red-700 mb-4">${_esc(PlaytomicVerificationService.describeFailure(failureReason))}</p>
                        <button data-action="retry" class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50">
                            Try a different screenshot
                        </button>
                    </div>
                `;
            case 'error':
                return `
                    <div class="rounded-2xl bg-red-50 border border-red-200 p-5">
                        <div class="font-semibold text-red-800 mb-1">Upload failed</div>
                        <p class="text-sm text-red-700 mb-4">${_esc(errorMessage || 'Something went wrong. Please try again.')}</p>
                        <button data-action="retry" class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50">
                            Retry
                        </button>
                    </div>
                `;
            case 'uploading':
            case 'verifying':
                return `
                    <div class="rounded-2xl bg-blue-50 border border-blue-200 p-6 text-center">
                        <div class="mx-auto w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center mb-3">
                            <svg class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                        </div>
                        <div class="font-semibold text-blue-800 mb-1">
                            ${status === 'uploading' ? 'Uploading screenshot' : 'Verifying with AI'}
                        </div>
                        <div class="text-sm text-blue-700 mb-3">
                            ${status === 'uploading' ? 'This usually takes a few seconds.' : "Reading your rating, confirming it's a Playtomic profile."}
                        </div>
                        <div class="mx-auto max-w-xs h-2 bg-blue-100 rounded-full overflow-hidden">
                            <div class="h-full bg-blue-500 transition-all" style="width:${pct}%"></div>
                        </div>
                    </div>
                `;
            default:
                // idle / waiting for a file
                return `
                    <label class="block rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40 p-6 text-center cursor-pointer transition">
                        <input type="file" accept="image/*" class="hidden" data-input="file" />
                        ${previewUrl ? `
                            <div class="mb-3">
                                <img src="${previewUrl}" alt="Preview" class="mx-auto max-h-48 rounded-xl shadow-sm" />
                            </div>
                            <div class="text-sm text-gray-700 font-medium">Ready to verify</div>
                        ` : `
                            <div class="text-4xl mb-2">📸</div>
                            <div class="text-sm text-gray-700 font-semibold mb-1">Upload a screenshot of your Playtomic profile</div>
                            <div class="text-xs text-gray-500">Must show your name and your rating (0–10). PNG or JPG, max 5 MB.</div>
                        `}
                    </label>
                    <div class="mt-3 flex justify-end gap-2">
                        ${previewUrl ? '<button data-action="clear" class="px-3 py-2 text-sm text-gray-600 hover:text-gray-900">Clear</button>' : ''}
                        <button data-action="submit"
                            ${state.file ? '' : 'disabled'}
                            class="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition">
                            Verify
                        </button>
                    </div>
                `;
        }
    })();

    el.innerHTML = body;
}

function _wire(el, state) {
    el.addEventListener('change', e => {
        if (e.target.dataset.input === 'file') {
            const file = e.target.files?.[0];
            if (file) {
                if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
                state.file = file;
                state.previewUrl = URL.createObjectURL(file);
                _render(el, state);
            }
        }
    });

    el.addEventListener('click', e => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        switch (action) {
            case 'clear':
                _reset(state);
                _render(el, state);
                break;
            case 'retry':
                _reset(state);
                _render(el, state);
                break;
            case 'submit':
                e.preventDefault();
                _submit(el, state).catch(err => {
                    state.status = 'error';
                    state.errorMessage = err?.message || String(err);
                    _render(el, state);
                });
                break;
        }
    });
}

function _reset(state) {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.file = null;
    state.previewUrl = null;
    state.progress = 0;
    state.status = 'idle';
    state.failureReason = null;
    state.extracted = null;
    state.verificationId = null;
    state.errorMessage = null;
}

async function _submit(el, state) {
    if (!state.file) return;
    state.status = 'uploading';
    state.progress = 0;
    _render(el, state);

    const result = await PlaytomicVerificationService.submitScreenshot(state.file, {
        onProgress(p) {
            state.progress = p;
            if (p >= 0.9 && state.status !== 'verifying') state.status = 'verifying';
            _render(el, state);
        }
    });

    if (result?.status === 'verified') {
        state.status = 'verified';
        state.verificationId = result.verificationId;
        state.extracted = {
            extractedRating:   result.extractedRating,
            extractedName:     result.extractedName,
            extractedUsername: result.extractedUsername
        };
        _render(el, state);
        if (typeof state.opts.onVerified === 'function') state.opts.onVerified(result);
        return;
    }

    if (result?.status === 'rejected') {
        state.status = 'rejected';
        state.failureReason = result.failureReason || 'unknown';
        _render(el, state);
        if (typeof state.opts.onRejected === 'function') {
            state.opts.onRejected(state.failureReason, result);
        }
        return;
    }

    // Unknown shape
    state.status = 'error';
    state.errorMessage = 'Unexpected response from server. Please retry.';
    _render(el, state);
}

function _esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (typeof window !== 'undefined') {
    window.PlaytomicScreenshotUpload = PlaytomicScreenshotUpload;
}

})();
