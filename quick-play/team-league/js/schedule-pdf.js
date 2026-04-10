// ===== TEAM LEAGUE - PER-TEAM SCHEDULE PDF EXPORT =====
//
// Generates per-team schedules matching the layout of the reference
// "Mo & Amaan" printout: Round / Court / Opponent, one row per court round,
// BREAK rows for court rounds the team isn't playing in.
//
// jsPDF + jspdf-autotable + jszip are lazy-loaded from a CDN the first time
// an export is triggered, to keep the initial page load unchanged.
//
// Exposes: window.TeamSchedulePdf = {
//   buildTeamRows(state, teamId),       // pure: returns Array<{ round, break?, court?, p1?, p2? }>
//   exportCombined(state),              // all teams, one per A4 page, single PDF download
//   exportZip(state),                   // ZIP of individual PDFs
//   shareTeam(state, teamId),           // navigator.share with File, falls back to download
// }

(function () {
    'use strict';

    // ---- CDN lazy-loader -------------------------------------------------
    const CDN = {
        jspdf:     'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
        autotable: 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js',
        jszip:     'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    };

    const _loading = {}; // url -> Promise

    function loadScript(url) {
        if (_loading[url]) return _loading[url];
        _loading[url] = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load ' + url));
            document.head.appendChild(s);
        });
        return _loading[url];
    }

    async function ensurePdfLibs() {
        // jsPDF must load before the autotable plugin (plugin augments jsPDF).
        await loadScript(CDN.jspdf);
        await loadScript(CDN.autotable);
    }

    async function ensureZipLib() {
        await loadScript(CDN.jszip);
    }

    function getJsPDF() {
        // UMD build exposes window.jspdf = { jsPDF }
        const ns = window.jspdf;
        if (!ns || !ns.jsPDF) throw new Error('jsPDF failed to load');
        return ns.jsPDF;
    }

    // ---- Pure row builder ------------------------------------------------

    /**
     * Build the rows for a single team's schedule. For every court round in
     * state.courtSchedule, either emit a match row (if the team plays) or a
     * BREAK row (if they don't).
     */
    function buildTeamRows(state, teamId) {
        const courtNamesArr = (state.courtNames && state.courtNames.group) || [];
        const schedule = Array.isArray(state.courtSchedule) ? state.courtSchedule : [];
        const rows = [];

        schedule.forEach((cr, crIdx) => {
            let found = null;
            for (let posInCR = 0; posInCR < cr.length; posInCR++) {
                const ref = cr[posInCR];
                const fixtures = state[`group${ref.group}Fixtures`] || [];
                const gr = fixtures[ref.genRound - 1];
                if (!gr || !gr.matches) continue;
                const match = gr.matches[ref.matchIdx];
                if (!match) continue;
                if (match.team1Id === teamId || match.team2Id === teamId) {
                    const oppId = match.team1Id === teamId ? match.team2Id : match.team1Id;
                    const opp = state.getTeamById(oppId);
                    found = {
                        round: crIdx + 1,
                        court: courtNamesArr[posInCR] || `Court ${posInCR + 1}`,
                        p1: (opp && opp.player1Name) || '',
                        p2: (opp && opp.player2Name) || '',
                    };
                    break;
                }
            }
            if (found) rows.push(found);
            else rows.push({ round: crIdx + 1, break: true });
        });

        return rows;
    }

    // ---- PDF rendering ---------------------------------------------------

    function sanitiseFilename(s) {
        return String(s || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'schedule';
    }

    function teamHeadingFor(team) {
        const p1 = (team && team.player1Name) || 'Player 1';
        const p2 = (team && team.player2Name) || 'Player 2';
        return `${p1} & ${p2}`;
    }

    /**
     * Render this team's schedule onto the given jsPDF doc, starting at the
     * current page. Does NOT call save() — caller decides whether to save,
     * addPage, or output as blob.
     */
    function renderTeamPage(doc, state, team) {
        const pageW = doc.internal.pageSize.getWidth();
        const marginX = 40;

        // Tournament name (small)
        const tname = (state.tournamentName || '').trim();
        let y = 52;
        if (tname) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(110);
            doc.text(tname, pageW / 2, y, { align: 'center' });
            y += 22;
        }

        // Team heading
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(20);
        doc.text(teamHeadingFor(team), pageW / 2, y, { align: 'center' });
        y += 18;

        // Build rows. Opponent cell is split into two sub-columns (p1, p2)
        // to match the reference PDF layout.
        const rows = buildTeamRows(state, team.id);
        const body = rows.map(r => {
            if (r.break) {
                return [
                    { content: String(r.round), styles: { halign: 'center', fontStyle: 'bold' } },
                    { content: 'BREAK', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
                ];
            }
            return [
                { content: String(r.round), styles: { halign: 'center', fontStyle: 'bold' } },
                { content: String(r.court), styles: { halign: 'center', fontStyle: 'bold' } },
                { content: r.p1, styles: { halign: 'center' } },
                { content: r.p2, styles: { halign: 'center' } },
            ];
        });

        // autotable
        doc.autoTable({
            startY: y + 16,
            margin: { left: marginX, right: marginX },
            head: [[
                { content: 'Round', styles: { halign: 'center' } },
                { content: 'Court', styles: { halign: 'center' } },
                { content: 'Opponent', colSpan: 2, styles: { halign: 'center' } },
            ]],
            body,
            theme: 'grid',
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: 20,
                fontStyle: 'bold',
                lineColor: [120, 120, 120],
                lineWidth: 0.75,
            },
            bodyStyles: {
                lineColor: [120, 120, 120],
                lineWidth: 0.75,
                textColor: 20,
                fontSize: 12,
            },
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 90 },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 'auto' },
            },
            styles: {
                cellPadding: 6,
                font: 'helvetica',
                lineColor: [120, 120, 120],
                lineWidth: 0.75,
            },
        });

        // Footer
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('uberpadel.com', pageW / 2, pageH - 24, { align: 'center' });
    }

    /** Ordered list of teams to export: group → id, within state.teams. */
    function teamsToExport(state) {
        const all = Array.isArray(state.teams) ? state.teams.slice() : [];
        // Sort by group (A..I, then no-group last), then id
        const groupRank = g => (g ? g.charCodeAt(0) : 999);
        all.sort((a, b) => {
            const ga = groupRank(a.group), gb = groupRank(b.group);
            if (ga !== gb) return ga - gb;
            return (a.id || 0) - (b.id || 0);
        });
        return all;
    }

    // ---- Public API ------------------------------------------------------

    /**
     * Build a single PDF containing one page per team. Saves with a name
     * derived from the tournament name.
     */
    async function exportCombined(state) {
        await ensurePdfLibs();
        const JsPDF = getJsPDF();
        const teams = teamsToExport(state);
        if (teams.length === 0) {
            throw new Error('No teams to export');
        }

        const doc = new JsPDF({ unit: 'pt', format: 'a4' });
        teams.forEach((team, idx) => {
            if (idx > 0) doc.addPage();
            renderTeamPage(doc, state, team);
        });

        const filename = `${sanitiseFilename(state.tournamentName || 'tournament')}-schedules.pdf`;
        doc.save(filename);
        return { count: teams.length, filename };
    }

    /**
     * Build one PDF per team and bundle them in a .zip download.
     */
    async function exportZip(state) {
        await ensurePdfLibs();
        await ensureZipLib();
        const JsPDF = getJsPDF();
        const JSZip = window.JSZip;
        if (!JSZip) throw new Error('JSZip failed to load');

        const teams = teamsToExport(state);
        if (teams.length === 0) throw new Error('No teams to export');

        const zip = new JSZip();
        const seen = {};
        teams.forEach(team => {
            const doc = new JsPDF({ unit: 'pt', format: 'a4' });
            renderTeamPage(doc, state, team);
            const blob = doc.output('blob');
            let base = sanitiseFilename(teamHeadingFor(team));
            // Disambiguate duplicate names
            if (seen[base]) {
                seen[base] += 1;
                base = `${base}-${seen[base]}`;
            } else {
                seen[base] = 1;
            }
            zip.file(`${base}.pdf`, blob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        const filename = `${sanitiseFilename(state.tournamentName || 'tournament')}-schedules.zip`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { count: teams.length, filename };
    }

    /**
     * Produce a single-team PDF. If navigator.share supports files, offers
     * the native share sheet; otherwise falls back to a download.
     */
    async function shareTeam(state, teamId) {
        await ensurePdfLibs();
        const JsPDF = getJsPDF();
        const team = state.getTeamById(teamId);
        if (!team) throw new Error('Team not found');

        const doc = new JsPDF({ unit: 'pt', format: 'a4' });
        renderTeamPage(doc, state, team);

        const blob = doc.output('blob');
        const filenameBase = sanitiseFilename(teamHeadingFor(team)) + '-schedule';
        const filename = `${filenameBase}.pdf`;

        // Try native share with a File (mobile-first path)
        try {
            if (typeof File !== 'undefined' && navigator.canShare) {
                const file = new File([blob], filename, { type: 'application/pdf' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: teamHeadingFor(team),
                        text: `${teamHeadingFor(team)} — schedule`,
                    });
                    return { shared: true, filename };
                }
            }
        } catch (err) {
            // User cancelled or share failed — fall through to download
            if (err && err.name === 'AbortError') return { shared: false, cancelled: true };
        }

        // Fallback: trigger a download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { shared: false, filename };
    }

    window.TeamSchedulePdf = {
        buildTeamRows,
        exportCombined,
        exportZip,
        shareTeam,
    };
})();
