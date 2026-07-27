/**
 * Result Card — Canvas 2D Leaderboard Image Generator
 *
 * Generates shareable leaderboard images as canvas elements for the
 * UberPadel platform. Supports two card sizes: landscape (1200x630)
 * for link previews and story (1080x1920) for Instagram/WhatsApp.
 *
 * Each format provides a `getCardData()` adapter that returns a
 * normalised data shape (similar to `getTvData()` for TV mode).
 *
 * Usage:
 *   const canvas = ResultCard.generateLandscape(data);
 *   ResultCard.download(data, 'landscape');
 *   await ResultCard.share(data, 'story');
 *
 * No imports — attach via <script src="/shared/result-card.js"></script>
 */

const ResultCard = {

    // -----------------------------------------------------------------
    // Accent color map (matches TV mode palette)
    // -----------------------------------------------------------------

    /** @type {Object<string, {gradient: string[], light: string}>} */
    _accentMap: {
        blue:    { gradient: ['#2563EB', '#1D4ED8'], light: '#3B82F6' },
        teal:    { gradient: ['#0D9488', '#047857'], light: '#14B8A6' },
        purple:  { gradient: ['#9333EA', '#7C3AED'], light: '#A855F7' },
        rose:    { gradient: ['#E11D48', '#BE185D'], light: '#FB7185' },
        emerald: { gradient: ['#059669', '#047857'], light: '#34D399' },
        amber:   { gradient: ['#D97706', '#B45309'], light: '#F59E0B' },
        orange:  { gradient: ['#EA580C', '#C2410C'], light: '#FB923C' },
        indigo:  { gradient: ['#4F46E5', '#4338CA'], light: '#818CF8' },
    },

    // -----------------------------------------------------------------
    // Color constants
    // -----------------------------------------------------------------

    _colors: {
        bgDark:       '#111827',
        bgSlightLight:'#1F2937',
        textWhite:    '#FFFFFF',
        textLight:    '#D1D5DB',
        textMuted:    '#9CA3AF',
        textDim:      '#6B7280',
        border:       '#374151',
        gold:         '#FFD700',
        silver:       '#C0C0C0',
        bronze:       '#CD7F32',
        green:        '#4ADE80',
        red:          '#F87171',
        footerBg:     '#0B0F19',
    },

    // -----------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------

    /**
     * Generate a landscape card (1200 x 630).
     *
     * @param {Object} data - Card data from getCardData()
     * @returns {HTMLCanvasElement}
     */
    generateLandscape(data) {
        const W = 1200;
        const H = 630;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        const accent = this._accentMap[data.accentColor] || this._accentMap.blue;
        const standings = (data.standings || []).slice(0, 10);

        // --- Background ---
        ctx.fillStyle = this._colors.bgDark;
        ctx.fillRect(0, 0, W, H);

        // --- Header gradient bar (90px) ---
        const headerH = 90;
        this._drawGradientRect(ctx, 0, 0, W, headerH, accent.gradient);

        // Format emoji + tournament name
        ctx.fillStyle = this._colors.textWhite;
        ctx.font = 'bold 30px sans-serif';
        const emojiText = data.formatEmoji || '';
        const nameText = data.tournamentName || 'Tournament';
        ctx.fillText(emojiText, 28, 42);
        const emojiWidth = emojiText ? ctx.measureText(emojiText).width + 14 : 0;
        ctx.fillText(nameText, 28 + emojiWidth, 42);

        // Format name (subtitle)
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '16px sans-serif';
        ctx.fillText(data.formatName || '', 28 + emojiWidth, 68);

        // Tournament code (right side)
        if (data.tournamentId) {
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = 'bold 18px sans-serif';
            const codeStr = 'CODE: ' + data.tournamentId.toUpperCase();
            const codeWidth = ctx.measureText(codeStr).width;
            ctx.fillText(codeStr, W - 28 - codeWidth, 42);
        }

        // --- Standings table ---
        const tableTop = headerH + 16;
        const footerH = 44;
        const tableBottom = H - footerH - 8;
        const rowH = standings.length > 0
            ? Math.min(44, Math.floor((tableBottom - tableTop - 36) / standings.length))
            : 44;

        // Determine visible columns
        const hasWins = standings.some(s => s.wins != null);
        const hasLosses = standings.some(s => s.losses != null);
        const hasPD = standings.some(s => s.pointsDiff != null);
        const hasPlayed = standings.some(s => s.played != null);

        // Column layout (x positions and widths)
        const cols = this._computeColumns(W, { hasPlayed, hasWins, hasLosses, hasPD });

        // Table header
        const headerY = tableTop + 24;
        ctx.fillStyle = this._colors.textDim;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('#', cols.rank.x, headerY);
        ctx.fillText('Name', cols.name.x, headerY);
        if (hasPlayed)  this._drawRightAligned(ctx, 'P',   cols.played.x + cols.played.w, headerY);
        if (hasWins)    this._drawRightAligned(ctx, 'W',   cols.wins.x + cols.wins.w, headerY);
        if (hasLosses)  this._drawRightAligned(ctx, 'L',   cols.losses.x + cols.losses.w, headerY);
        if (hasPD)      this._drawRightAligned(ctx, 'PD',  cols.pd.x + cols.pd.w, headerY);
        this._drawRightAligned(ctx, 'PTS', cols.pts.x + cols.pts.w, headerY);

        // Divider under header
        const divY = tableTop + 34;
        ctx.strokeStyle = this._colors.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(24, divY);
        ctx.lineTo(W - 24, divY);
        ctx.stroke();

        // Rows
        if (standings.length === 0) {
            ctx.fillStyle = this._colors.textDim;
            ctx.font = '18px sans-serif';
            ctx.fillText('No results yet', W / 2 - 60, tableTop + 80);
        } else {
            standings.forEach((s, i) => {
                const rowY = divY + 6 + i * rowH;
                const textY = rowY + rowH * 0.65;

                // Row highlight for top 3
                if (i < 3) {
                    ctx.fillStyle = this._hexToRgba(accent.light, 0.10);
                    ctx.fillRect(24, rowY, W - 48, rowH);
                }

                // Rank indicator
                this._drawRank(ctx, s.rank, cols.rank.x, rowY + rowH / 2, 14, 'landscape');

                // Name (truncated)
                ctx.fillStyle = this._colors.textWhite;
                ctx.font = 'bold 16px sans-serif';
                const truncName = this._truncateText(ctx, s.name || '', cols.name.w);
                ctx.fillText(truncName, cols.name.x, textY);

                // Played
                if (hasPlayed) {
                    ctx.fillStyle = this._colors.textMuted;
                    ctx.font = '15px sans-serif';
                    this._drawRightAligned(ctx, String(s.played ?? ''), cols.played.x + cols.played.w, textY);
                }

                // Wins
                if (hasWins) {
                    ctx.fillStyle = this._colors.green;
                    ctx.font = '15px sans-serif';
                    this._drawRightAligned(ctx, String(s.wins ?? ''), cols.wins.x + cols.wins.w, textY);
                }

                // Losses
                if (hasLosses) {
                    ctx.fillStyle = this._colors.red;
                    ctx.font = '15px sans-serif';
                    this._drawRightAligned(ctx, String(s.losses ?? ''), cols.losses.x + cols.losses.w, textY);
                }

                // Point Diff
                if (hasPD) {
                    const pd = s.pointsDiff;
                    const pdStr = pd != null ? (pd > 0 ? '+' + pd : String(pd)) : '';
                    ctx.fillStyle = pd > 0 ? this._colors.green : pd < 0 ? this._colors.red : this._colors.textDim;
                    ctx.font = '15px sans-serif';
                    this._drawRightAligned(ctx, pdStr, cols.pd.x + cols.pd.w, textY);
                }

                // Points
                ctx.fillStyle = accent.light;
                ctx.font = 'bold 18px sans-serif';
                this._drawRightAligned(ctx, String(s.points ?? ''), cols.pts.x + cols.pts.w, textY);
            });
        }

        // --- Footer ---
        this._drawFooter(ctx, data, 0, H - footerH, W, footerH, accent);

        return canvas;
    },

    /**
     * Generate a story card (1080 x 1920).
     *
     * @param {Object} data - Card data from getCardData()
     * @returns {HTMLCanvasElement}
     */
    generateStory(data) {
        const W = 1080;
        const H = 1920;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        const accent = this._accentMap[data.accentColor] || this._accentMap.blue;
        const standings = (data.standings || []).slice(0, 12);

        // --- Background ---
        ctx.fillStyle = this._colors.bgDark;
        ctx.fillRect(0, 0, W, H);

        // --- Header gradient area (250px) ---
        const headerH = 250;
        this._drawGradientRect(ctx, 0, 0, W, headerH, accent.gradient);

        // Format emoji
        ctx.fillStyle = this._colors.textWhite;
        ctx.font = 'bold 48px sans-serif';
        const emojiText = data.formatEmoji || '';
        if (emojiText) {
            ctx.fillText(emojiText, 48, 90);
        }

        // Tournament name
        ctx.fillStyle = this._colors.textWhite;
        ctx.font = 'bold 44px sans-serif';
        const nameText = data.tournamentName || 'Tournament';
        const truncTourneyName = this._truncateText(ctx, nameText, W - 96);
        ctx.fillText(truncTourneyName, 48, 155);

        // Format name (subtitle)
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '24px sans-serif';
        ctx.fillText(data.formatName || '', 48, 195);

        // Tournament code (right side, vertically centered)
        if (data.tournamentId) {
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = 'bold 26px sans-serif';
            const codeStr = 'CODE: ' + data.tournamentId.toUpperCase();
            const codeWidth = ctx.measureText(codeStr).width;
            ctx.fillText(codeStr, W - 48 - codeWidth, 90);
        }

        // --- Standings table ---
        const tableTop = headerH + 30;
        const footerH = 70;
        const tableBottom = H - footerH - 20;
        const rowH = standings.length > 0
            ? Math.min(65, Math.floor((tableBottom - tableTop - 60) / Math.max(standings.length, 1)))
            : 65;

        // Determine visible columns
        const hasWins = standings.some(s => s.wins != null);
        const hasLosses = standings.some(s => s.losses != null);
        const hasPD = standings.some(s => s.pointsDiff != null);
        const hasPlayed = standings.some(s => s.played != null);

        // Column layout
        const cols = this._computeColumns(W, { hasPlayed, hasWins, hasLosses, hasPD });

        // Table header
        const headerY = tableTop + 34;
        ctx.fillStyle = this._colors.textDim;
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('#', cols.rank.x, headerY);
        ctx.fillText('Name', cols.name.x, headerY);
        if (hasPlayed)  this._drawRightAligned(ctx, 'P',   cols.played.x + cols.played.w, headerY);
        if (hasWins)    this._drawRightAligned(ctx, 'W',   cols.wins.x + cols.wins.w, headerY);
        if (hasLosses)  this._drawRightAligned(ctx, 'L',   cols.losses.x + cols.losses.w, headerY);
        if (hasPD)      this._drawRightAligned(ctx, 'PD',  cols.pd.x + cols.pd.w, headerY);
        this._drawRightAligned(ctx, 'PTS', cols.pts.x + cols.pts.w, headerY);

        // Divider under header
        const divY = tableTop + 48;
        ctx.strokeStyle = this._colors.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, divY);
        ctx.lineTo(W - 40, divY);
        ctx.stroke();

        // Rows
        if (standings.length === 0) {
            ctx.fillStyle = this._colors.textDim;
            ctx.font = '28px sans-serif';
            ctx.fillText('No results yet', W / 2 - 100, tableTop + 140);
        } else {
            standings.forEach((s, i) => {
                const rowY = divY + 10 + i * rowH;
                const textY = rowY + rowH * 0.62;

                // Row highlight for top 3
                if (i < 3) {
                    ctx.fillStyle = this._hexToRgba(accent.light, 0.10);
                    ctx.fillRect(40, rowY, W - 80, rowH);
                }

                // Rank indicator
                this._drawRank(ctx, s.rank, cols.rank.x, rowY + rowH / 2, 18, 'story');

                // Name (truncated)
                ctx.fillStyle = this._colors.textWhite;
                ctx.font = 'bold 24px sans-serif';
                const truncName = this._truncateText(ctx, s.name || '', cols.name.w);
                ctx.fillText(truncName, cols.name.x, textY);

                // Played
                if (hasPlayed) {
                    ctx.fillStyle = this._colors.textMuted;
                    ctx.font = '22px sans-serif';
                    this._drawRightAligned(ctx, String(s.played ?? ''), cols.played.x + cols.played.w, textY);
                }

                // Wins
                if (hasWins) {
                    ctx.fillStyle = this._colors.green;
                    ctx.font = '22px sans-serif';
                    this._drawRightAligned(ctx, String(s.wins ?? ''), cols.wins.x + cols.wins.w, textY);
                }

                // Losses
                if (hasLosses) {
                    ctx.fillStyle = this._colors.red;
                    ctx.font = '22px sans-serif';
                    this._drawRightAligned(ctx, String(s.losses ?? ''), cols.losses.x + cols.losses.w, textY);
                }

                // Point Diff
                if (hasPD) {
                    const pd = s.pointsDiff;
                    const pdStr = pd != null ? (pd > 0 ? '+' + pd : String(pd)) : '';
                    ctx.fillStyle = pd > 0 ? this._colors.green : pd < 0 ? this._colors.red : this._colors.textDim;
                    ctx.font = '22px sans-serif';
                    this._drawRightAligned(ctx, pdStr, cols.pd.x + cols.pd.w, textY);
                }

                // Points
                ctx.fillStyle = accent.light;
                ctx.font = 'bold 28px sans-serif';
                this._drawRightAligned(ctx, String(s.points ?? ''), cols.pts.x + cols.pts.w, textY);
            });
        }

        // --- Footer ---
        this._drawFooter(ctx, data, 0, H - footerH, W, footerH, accent);

        return canvas;
    },

    /**
     * Generate a card and trigger a PNG file download.
     *
     * @param {Object} data - Card data from getCardData()
     * @param {'landscape'|'story'} [size='landscape'] - Card size
     */
    download(data, size) {
        if (!size) size = 'landscape';
        const canvas = size === 'story'
            ? this.generateStory(data)
            : this.generateLandscape(data);

        const safeName = (data.tournamentName || 'results')
            .replace(/[^a-zA-Z0-9 _-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
        const filename = safeName + '-' + size + '.png';

        canvas.toBlob(function(blob) {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            // Clean up
            setTimeout(function() {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }, 'image/png');
    },

    /**
     * Generate a card and share via native share or download fallback.
     * Attempts SocialShare.nativeShareWithImage() first (if available),
     * then falls back to download().
     *
     * @param {Object} data - Card data from getCardData()
     * @param {'landscape'|'story'} [size='landscape'] - Card size
     * @returns {Promise<void>}
     */
    async share(data, size) {
        if (!size) size = 'landscape';
        const canvas = size === 'story'
            ? this.generateStory(data)
            : this.generateLandscape(data);

        const safeName = (data.tournamentName || 'results')
            .replace(/[^a-zA-Z0-9 _-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
        const filename = safeName + '-' + size + '.png';

        // Wrap toBlob in a promise
        const blob = await new Promise(function(resolve) {
            canvas.toBlob(function(b) { resolve(b); }, 'image/png');
        });

        if (!blob) {
            // Canvas conversion failed — nothing we can do
            return;
        }

        // Try SocialShare native image sharing (mobile)
        if (typeof SocialShare !== 'undefined' && SocialShare.nativeShareWithImage) {
            const title = (data.tournamentName || 'Tournament') + ' Results';
            const text = (data.formatEmoji || '') + ' ' + title;
            const shared = await SocialShare.nativeShareWithImage(title, text, blob, filename);
            if (shared) return;
        }

        // Fallback: trigger download instead
        this.download(data, size);
    },

    // -----------------------------------------------------------------
    // Internal drawing helpers
    // -----------------------------------------------------------------

    /**
     * Draw a filled rectangle with a vertical linear gradient.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {string[]} colors - Two hex color stops [start, end]
     */
    _drawGradientRect(ctx, x, y, w, h, colors) {
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
    },

    /**
     * Draw a rank indicator. Ranks 1-3 get coloured medal circles;
     * rank 4+ shows the number in gray text.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} rank
     * @param {number} x - Left edge of rank column
     * @param {number} cy - Vertical center of the row
     * @param {number} r - Circle radius
     * @param {'landscape'|'story'} mode
     */
    _drawRank(ctx, rank, x, cy, r, mode) {
        const medalColors = {
            1: this._colors.gold,
            2: this._colors.silver,
            3: this._colors.bronze,
        };

        const fontSize = mode === 'story' ? 20 : 14;
        const circleX = x + r + 2;

        if (rank >= 1 && rank <= 3) {
            // Filled medal circle
            ctx.beginPath();
            ctx.arc(circleX, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = medalColors[rank];
            ctx.fill();

            // Number inside circle
            ctx.fillStyle = '#000000';
            ctx.font = 'bold ' + fontSize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(rank), circleX, cy);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
        } else {
            // Plain number
            ctx.fillStyle = this._colors.textDim;
            ctx.font = 'bold ' + fontSize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(rank), circleX, cy);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
        }
    },

    /**
     * Draw footer bar with optional progress indicator and branding.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} data
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {Object} accent
     */
    _drawFooter(ctx, data, x, y, w, h, accent) {
        // Footer background
        ctx.fillStyle = this._colors.footerBg;
        ctx.fillRect(x, y, w, h);

        // Top border
        ctx.strokeStyle = this._colors.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();

        const padX = 28;
        const centerY = y + h / 2;
        const fontSize = h > 50 ? 20 : 14;

        // Progress (left side)
        if (data.totalMatches && data.completedMatches != null) {
            const progressText = data.completedMatches + ' / ' + data.totalMatches + ' matches';

            // Progress bar
            const barW = 120;
            const barH = 8;
            const barX = padX;
            const barY = centerY - barH / 2;
            const pct = Math.min(data.completedMatches / data.totalMatches, 1);

            // Bar background
            ctx.fillStyle = this._colors.border;
            this._drawRoundedRect(ctx, barX, barY, barW, barH, 4);
            ctx.fill();

            // Bar fill
            if (pct > 0) {
                const grad = ctx.createLinearGradient(barX, barY, barX + barW * pct, barY);
                grad.addColorStop(0, accent.gradient[0]);
                grad.addColorStop(1, accent.light);
                ctx.fillStyle = grad;
                this._drawRoundedRect(ctx, barX, barY, barW * pct, barH, 4);
                ctx.fill();
            }

            // Progress text
            ctx.fillStyle = this._colors.textDim;
            ctx.font = fontSize + 'px sans-serif';
            ctx.fillText(progressText, barX + barW + 12, centerY + fontSize / 3);
        }

        // Branding (right side)
        ctx.fillStyle = this._colors.textDim;
        ctx.font = fontSize + 'px sans-serif';
        const brand = 'uberpadel.com';
        const brandW = ctx.measureText(brand).width;
        ctx.fillText(brand, x + w - padX - brandW, centerY + fontSize / 3);
    },

    /**
     * Draw a rounded rectangle path (does not fill or stroke).
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} r - Corner radius
     */
    _drawRoundedRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    },

    /**
     * Compute column positions for the standings table.
     * Adjusts widths based on which optional columns are visible.
     *
     * @param {number} canvasW - Canvas width
     * @param {Object} opts
     * @param {boolean} opts.hasPlayed
     * @param {boolean} opts.hasWins
     * @param {boolean} opts.hasLosses
     * @param {boolean} opts.hasPD
     * @returns {Object} Column definitions with { x, w } for each column
     */
    _computeColumns(canvasW, opts) {
        const pad = canvasW >= 1200 ? 28 : 48;
        const rightEdge = canvasW - pad;

        // Fixed-width columns from the right
        const ptsW = 70;
        const statW = 50;

        // Count optional stat columns
        let optionalCount = 0;
        if (opts.hasPlayed) optionalCount++;
        if (opts.hasWins) optionalCount++;
        if (opts.hasLosses) optionalCount++;
        if (opts.hasPD) optionalCount++;

        // Points column (rightmost)
        const ptsX = rightEdge - ptsW;

        // Stat columns right-to-left before PTS
        let cursor = ptsX - 10;

        const pdCol = { x: 0, w: statW };
        const lossCol = { x: 0, w: statW };
        const winCol = { x: 0, w: statW };
        const playedCol = { x: 0, w: statW };

        if (opts.hasPD) {
            pdCol.x = cursor - statW;
            cursor = pdCol.x - 8;
        }
        if (opts.hasLosses) {
            lossCol.x = cursor - statW;
            cursor = lossCol.x - 8;
        }
        if (opts.hasWins) {
            winCol.x = cursor - statW;
            cursor = winCol.x - 8;
        }
        if (opts.hasPlayed) {
            playedCol.x = cursor - statW;
            cursor = playedCol.x - 8;
        }

        // Rank column
        const rankX = pad;
        const rankW = 44;

        // Name takes remaining space
        const nameX = rankX + rankW;
        const nameW = cursor - nameX;

        return {
            rank:   { x: rankX, w: rankW },
            name:   { x: nameX, w: Math.max(nameW, 60) },
            played: playedCol,
            wins:   winCol,
            losses: lossCol,
            pd:     pdCol,
            pts:    { x: ptsX, w: ptsW },
        };
    },

    /**
     * Draw text right-aligned at a given x position.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} rightX - Right edge x
     * @param {number} y
     */
    _drawRightAligned(ctx, text, rightX, y) {
        const w = ctx.measureText(text).width;
        ctx.fillText(text, rightX - w, y);
    },

    /**
     * Truncate text with ellipsis if it exceeds maxWidth.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} maxWidth
     * @returns {string}
     */
    _truncateText(ctx, text, maxWidth) {
        if (maxWidth <= 0) return '';
        if (ctx.measureText(text).width <= maxWidth) return text;

        const ellipsis = '\u2026'; // ...
        const ellipsisW = ctx.measureText(ellipsis).width;
        let truncated = text;

        while (truncated.length > 0 && ctx.measureText(truncated).width + ellipsisW > maxWidth) {
            truncated = truncated.slice(0, -1);
        }

        return truncated + ellipsis;
    },

    /**
     * Convert a hex colour to an rgba() string.
     *
     * @param {string} hex - e.g. '#3B82F6'
     * @param {number} alpha - 0 to 1
     * @returns {string}
     */
    _hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    },

    // -----------------------------------------------------------------
    // Tournament Completion Modal
    // -----------------------------------------------------------------

    /** Track whether we've already shown the completion modal for this tournament */
    _completionShownFor: null,

    /**
     * Show a celebration modal when a tournament is complete.
     * Call this from the render loop — it uses _completionShownFor to
     * avoid re-popping on every render cycle.
     *
     * @param {Object} cardData - result of getCardData()
     * @param {Object} [opts]
     * @param {string} [opts.containerId='modal-container'] - modal mount point
     */
    showCompletionModal(cardData, opts) {
        if (!cardData) return;
        const id = cardData.tournamentId;
        if (!id) return;

        // Only show once per tournament
        const storageKey = 'completion_shown_' + id;
        if (this._completionShownFor === id) return;
        if (sessionStorage.getItem(storageKey)) {
            this._completionShownFor = id;
            return;
        }
        this._completionShownFor = id;
        sessionStorage.setItem(storageKey, '1');

        const containerId = (opts && opts.containerId) || 'modal-container';
        const container = document.getElementById(containerId);
        if (!container) return;

        const standings = cardData.standings || [];
        const top3 = standings.slice(0, 3);
        const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
        const accent = this._accentMap[cardData.accentColor] || this._accentMap.blue;
        const gradFrom = accent.gradient[0];
        const gradTo = accent.gradient[1];

        const podiumHTML = top3.map(function(s, i) {
            return '<div class="flex items-center gap-3 py-2">' +
                '<span class="text-2xl">' + medals[i] + '</span>' +
                '<span class="font-bold text-gray-800 text-lg">' + (s.name || 'Unknown') + '</span>' +
                '<span class="ml-auto font-mono font-semibold text-gray-600">' + (s.points != null ? s.points + ' pts' : '') + '</span>' +
            '</div>';
        }).join('');

        container.innerHTML = '<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onclick="if(event.target===this)this.parentElement.innerHTML=\'\'">' +
            '<div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in" onclick="event.stopPropagation()">' +
                '<div class="p-6 text-center text-white" style="background:linear-gradient(135deg,' + gradFrom + ',' + gradTo + ')">' +
                    '<div class="text-5xl mb-3">\u{1F3C6}</div>' +
                    '<h2 class="text-2xl font-bold">Tournament Complete!</h2>' +
                    '<p class="text-white/80 mt-1">' + (cardData.tournamentName || 'Tournament') + '</p>' +
                '</div>' +
                '<div class="p-6">' +
                    (podiumHTML ? '<div class="mb-6">' + podiumHTML + '</div>' : '') +
                    '<div class="flex flex-col gap-3">' +
                        '<button onclick="ResultCard.share(typeof getCardData===\'function\'?getCardData():null,\'landscape\');this.closest(\'[class*=fixed]\').parentElement.innerHTML=\'\'" ' +
                            'class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors">' +
                            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' +
                            'Share Leaderboard Image' +
                        '</button>' +
                        '<button onclick="ResultCard.share(typeof getCardData===\'function\'?getCardData():null,\'story\');this.closest(\'[class*=fixed]\').parentElement.innerHTML=\'\'" ' +
                            'class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-colors">' +
                            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>' +
                            'Share to Story' +
                        '</button>' +
                        (typeof SocialShare !== 'undefined' ? (
                            '<button onclick="SocialShare.shareWhatsApp(SocialShare.getRichShareText(\'' +
                                (cardData.tournamentName || '').replace(/'/g, "\\'") + '\',\'' +
                                (cardData.tournamentId || '') + '\',\'' +
                                (cardData.formatName || '') + '\',SocialShare.getOgShareUrl(\'' +
                                (cardData.formatName || '') + '\',\'' +
                                (cardData.tournamentId || '') + '\'),' +
                                JSON.stringify(standings.slice(0, 3).map(function(s) { return { name: s.name, points: s.points }; })) +
                            '));this.closest(\'[class*=fixed]\').parentElement.innerHTML=\'\'" ' +
                            'class="w-full flex items-center justify-center gap-2 px-4 py-3 text-white font-semibold rounded-xl transition-colors" style="background:#25D366">' +
                                '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.913.913l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.287 0-4.4-.763-6.098-2.047a.75.75 0 00-.653-.132l-3.12 1.046 1.046-3.12a.75.75 0 00-.132-.653A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>' +
                                'Share on WhatsApp' +
                            '</button>'
                        ) : '') +
                        '<button onclick="this.closest(\'[class*=fixed]\').parentElement.innerHTML=\'\'" ' +
                            'class="w-full px-4 py-3 text-gray-500 hover:text-gray-700 font-medium rounded-xl transition-colors">' +
                            'Maybe Later' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    },
};
