/**
 * Shared Social Sharing Utility
 *
 * Centralised share logic for the UberPadel platform.
 * Provides native sharing, WhatsApp, clipboard, and
 * ready-made share button HTML for modals.
 *
 * Usage:
 *   const html = SocialShare.getShareButtons(name, id, format, link, standings);
 *   document.getElementById('share-target').innerHTML = html;
 *
 * No imports — attach via <script src="/shared/social-share.js"></script>
 */

const SocialShare = {

    // -----------------------------------------------------------------
    // Internal state — populated by getShareButtons() so that the
    // inline onclick handlers (_handleNativeShare / _handleWhatsApp)
    // can access the current share context without closures.
    // -----------------------------------------------------------------
    _currentData: null,

    // -----------------------------------------------------------------
    // Format emoji map
    // -----------------------------------------------------------------

    /**
     * Return the emoji that represents a given tournament format.
     * Falls back to a generic paddle emoji for unknown formats.
     *
     * @param {string} format - Format key (e.g. 'americano', 'knockout')
     * @returns {string} Emoji character
     */
    getFormatEmoji(format) {
        const map = {
            americano:      '\u{1F504}',   // 🔄
            mexicano:       '\u{1F32E}',   // 🌮
            mixicano:       '\u{1F500}',   // 🔀
            mix:            '\u{1F3B2}',   // 🎲
            tournament:     '\u{1F3D3}',   // 🏓
            'team-league':  '\u{1F465}',   // 👥
            knockout:       '\u{2694}\uFE0F', // ⚔️
            'round-robin':  '\u{1F501}',   // 🔁
            swiss:          '\u265F\uFE0F', // ♟️
        };
        return map[format] || '\u{1F3BE}'; // 🎾
    },

    // -----------------------------------------------------------------
    // Plain-text share messages
    // -----------------------------------------------------------------

    /**
     * Build a short, copy-friendly share message.
     *
     * @param {string} tournamentName - Display name of the tournament
     * @param {string} tournamentId   - 6-char tournament code
     * @param {string} format         - Format key
     * @returns {string} Multi-line plain text
     */
    getShareText(tournamentName, tournamentId, format) {
        const emoji = this.getFormatEmoji(format);
        return `${emoji} Join my padel session "${tournamentName}"!\nCode: ${tournamentId.toUpperCase()}`;
    },

    /**
     * Build a richer share message that includes a top-3 leaderboard
     * and a direct link. If standings data is unavailable the method
     * falls back to the simple share text.
     *
     * @param {string}      tournamentName - Display name
     * @param {string}      tournamentId   - 6-char code
     * @param {string}      format         - Format key
     * @param {string}      playerLink     - Full URL to the tournament
     * @param {Array|null}  standings      - Sorted array of { name, points }
     * @returns {string} Multi-line plain text
     */
    getRichShareText(tournamentName, tournamentId, format, playerLink, standings) {
        // Fall back when there is nothing to show
        if (!standings || standings.length === 0) {
            return this.getShareText(tournamentName, tournamentId, format);
        }

        const emoji = this.getFormatEmoji(format);
        const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}']; // 🥇 🥈 🥉
        const top3 = standings.slice(0, 3);

        let leaderboard = top3
            .map((entry, i) => `${medals[i]} ${entry.name} \u2014 ${entry.points} pts`)
            .join('\n');

        return [
            `${emoji} "${tournamentName}" \u2014 Live Scores!`,
            '',
            '\u{1F4CA} Leaderboard:',
            leaderboard,
            '',
            `Join: ${playerLink}`,
        ].join('\n');
    },

    // -----------------------------------------------------------------
    // Native Web Share API
    // -----------------------------------------------------------------

    /**
     * Trigger the native share sheet (mobile browsers, some desktops).
     * Returns true if the share completed, false if the API is missing
     * or the user cancelled / an error occurred.
     *
     * @param {string} title - Share dialog title
     * @param {string} text  - Body text
     * @param {string} url   - URL to share
     * @returns {Promise<boolean>}
     */
    async nativeShare(title, text, url) {
        if (!navigator.share) {
            return false;
        }
        try {
            await navigator.share({ title, text, url });
            return true;
        } catch (err) {
            // User tapped "Cancel" — not an error we need to surface
            if (err.name === 'AbortError') {
                return false;
            }
            console.warn('SocialShare.nativeShare failed:', err);
            return false;
        }
    },

    /**
     * Share an image blob via the native share sheet.
     * Only works in browsers that support file sharing (canShare).
     *
     * @param {string} title    - Share dialog title
     * @param {string} text     - Body text
     * @param {Blob}   blob     - Image blob (e.g. from canvas.toBlob)
     * @param {string} filename - File name including extension
     * @returns {Promise<boolean>}
     */
    async nativeShareWithImage(title, text, blob, filename) {
        if (!navigator.share) {
            return false;
        }

        const file = new File([blob], filename, { type: blob.type });
        const shareData = { title, text, files: [file] };

        // Check browser support for file sharing
        if (!navigator.canShare || !navigator.canShare(shareData)) {
            return false;
        }

        try {
            await navigator.share(shareData);
            return true;
        } catch (err) {
            if (err.name === 'AbortError') {
                return false;
            }
            console.warn('SocialShare.nativeShareWithImage failed:', err);
            return false;
        }
    },

    // -----------------------------------------------------------------
    // WhatsApp
    // -----------------------------------------------------------------

    /**
     * Open a WhatsApp share link in a new tab/window.
     * The message body is built from the provided text and optional URL.
     *
     * @param {string} text - Message body
     * @param {string} [url] - Optional URL appended after a newline
     */
    shareWhatsApp(text, url) {
        const message = url ? `${text}\n${url}` : text;
        const encoded = encodeURIComponent(message);
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    },

    // -----------------------------------------------------------------
    // Clipboard
    // -----------------------------------------------------------------

    /**
     * Copy text to the clipboard. Uses the modern Clipboard API when
     * available, falling back to a hidden textarea + execCommand for
     * older browsers or non-secure contexts.
     *
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} true if the copy succeeded
     */
    async copyToClipboard(text) {
        // Modern path
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (_) {
                // Fall through to legacy path
            }
        }

        // Legacy fallback
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(textarea);
            return ok;
        } catch (_) {
            return false;
        }
    },

    // -----------------------------------------------------------------
    // Ready-made share buttons (HTML string)
    // -----------------------------------------------------------------

    /**
     * Return an HTML string containing a row of share buttons suitable
     * for injection into a modal. The buttons are:
     *   - "Share" (native Web Share API — hidden when unsupported)
     *   - "WhatsApp"
     *
     * The current share context is stored on `SocialShare._currentData`
     * so that the inline onclick handlers can retrieve it.
     *
     * @param {string}      tournamentName - Display name
     * @param {string}      tournamentId   - 6-char code
     * @param {string}      format         - Format key
     * @param {string}      playerLink     - Full URL to the tournament
     * @param {Array|null}  standings      - Sorted array of { name, points }
     * @returns {string} HTML
     */
    getShareButtons(tournamentName, tournamentId, format, playerLink, standings) {
        // Persist context for the onclick handlers
        this._currentData = {
            tournamentName,
            tournamentId,
            format,
            playerLink,
            standings,
        };

        const nativeShareVisible = (typeof navigator !== 'undefined' && navigator.share)
            ? 'flex'
            : 'none';

        // SVG: share icon (stroke-based, no fill)
        const shareIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>`;

        // SVG: WhatsApp logo (filled path)
        const whatsappIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

        return `
            <div style="display:flex;gap:12px;">
                <button onclick="event.stopPropagation(); SocialShare._handleNativeShare()"
                    style="display:${nativeShareVisible};flex:1;align-items:center;justify-content:center;gap:8px;padding:12px 16px;background:#3B82F6;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s;"
                    onmouseenter="this.style.background='#2563EB'"
                    onmouseleave="this.style.background='#3B82F6'">
                    ${shareIconSVG} Share
                </button>
                <button onclick="event.stopPropagation(); SocialShare._handleWhatsApp()"
                    style="display:flex;flex:1;align-items:center;justify-content:center;gap:8px;padding:12px 16px;background:#25D366;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s;"
                    onmouseenter="this.style.background='#1EBE5A'"
                    onmouseleave="this.style.background='#25D366'">
                    ${whatsappIconSVG} WhatsApp
                </button>
            </div>`;
    },

    // -----------------------------------------------------------------
    // OG share URL
    // -----------------------------------------------------------------

    /**
     * Build the OG-worker share URL for a tournament. This URL
     * serves proper og:image meta tags for social media previews,
     * then redirects the browser to the actual tournament page.
     *
     * @param {string} format - Format key (e.g. 'americano')
     * @param {string} tournamentId - 6-char tournament code
     * @returns {string} URL like https://og.uberpadel.com/americano/ABC123
     */
    // Change this to 'https://og.uberpadel.com' once custom domain DNS is configured
    _ogWorkerBase: 'https://uberpadel-og.asatire.workers.dev',

    getOgShareUrl(format, tournamentId) {
        return `${this._ogWorkerBase}/${encodeURIComponent(format)}/${encodeURIComponent(tournamentId)}`;
    },

    // -----------------------------------------------------------------
    // Internal onclick handlers (called from inline HTML)
    // -----------------------------------------------------------------

    /**
     * Trigger a native share using the stored context data.
     * Called by the "Share" button rendered in getShareButtons().
     * Uses the OG worker URL so social previews get dynamic images.
     */
    _handleNativeShare() {
        const d = SocialShare._currentData;
        if (!d) return;

        const shareUrl = SocialShare.getOgShareUrl(d.format, d.tournamentId);

        const text = SocialShare.getRichShareText(
            d.tournamentName,
            d.tournamentId,
            d.format,
            shareUrl,
            d.standings
        );

        SocialShare.nativeShare(d.tournamentName, text, shareUrl);
    },

    /**
     * Open a WhatsApp share window using the stored context data.
     * Called by the "WhatsApp" button rendered in getShareButtons().
     * Uses the OG worker URL so social previews get dynamic images.
     */
    _handleWhatsApp() {
        const d = SocialShare._currentData;
        if (!d) return;

        const shareUrl = SocialShare.getOgShareUrl(d.format, d.tournamentId);

        const text = SocialShare.getRichShareText(
            d.tournamentName,
            d.tournamentId,
            d.format,
            shareUrl,
            d.standings
        );

        // Don't pass shareUrl separately — it's already in the rich text
        SocialShare.shareWhatsApp(text);
    },
};
