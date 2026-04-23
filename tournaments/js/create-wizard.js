/**
 * tournaments/js/create-wizard.js — Unified 3-step create wizard
 *
 * Step 1: Format picker (reads FORMAT_CONFIG.supportedModes).
 * Step 2: Registration mode (names-only always; open disabled until Phase C).
 * Step 3: Format-specific config + location (required for open-reg, optional
 *         for names-only publication).
 *
 * On submit → writes to `tournaments/{id}` with the unified schema and
 * redirects to manage.html for registered-mode / play legacy URL for
 * names-only quick-play flow.
 */

const CreateWizard = {
    state: {
        step: 1,
        format: null,
        registrationMode: null, // 'names_only' | 'open'
        formatConfig: {},
        name: '',
        location: null,         // { postcode, lat, lng, venue, line1? }
        // Open-reg-only fields (Phase C lights these up)
        startDate: null,
        registrationDeadline: null,
        maxPairs: null,
        maxPlayers: null,
        ratingLimit: { type: 'none' },
        entryFeeGBP: 0,
        // Names-only-only fields
        namesOnly: {
            playerCount: null,
            playerNames: [],
            courts: null,
            courtNames: []
        }
    },

    mount(containerId = 'wizard') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`CreateWizard: container #${containerId} not found`);
            return;
        }
        this._render();
        this.container.addEventListener('click', e => this._onClick(e));
        this.container.addEventListener('input',  e => this._onInput(e));
        this.container.addEventListener('change', e => this._onChange(e));
    },

    // -----------------------------------------------------------------------
    // Rendering
    // -----------------------------------------------------------------------

    _render() {
        const stepHtml = {
            1: () => this._renderStep1(),
            2: () => this._renderStep2(),
            3: () => this._renderStep3()
        }[this.state.step]();

        this.container.innerHTML = `
            <div class="max-w-3xl mx-auto">
                ${this._renderProgress()}
                <div class="mt-6">
                    ${stepHtml}
                </div>
            </div>
        `;
    },

    _renderProgress() {
        const steps = ['Format', 'How players join', 'Details'];
        return `
            <div class="flex items-center gap-2 mb-4">
                ${steps.map((label, i) => `
                    <div class="flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}">
                        <div class="w-8 h-8 rounded-full ${i + 1 <= this.state.step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'} flex items-center justify-center text-sm font-bold">${i + 1}</div>
                        <span class="ml-2 text-sm ${i + 1 === this.state.step ? 'font-semibold text-gray-900' : 'text-gray-500'}">${label}</span>
                        ${i < steps.length - 1 ? '<div class="flex-1 h-1 mx-3 bg-gray-200 rounded"></div>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    _renderStep1() {
        const formats = getPickerFormats();
        return `
            <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 class="text-xl font-bold text-gray-900 mb-1">Pick a tournament format</h2>
                <p class="text-sm text-gray-600 mb-6">You can change almost everything later — format is fixed once the tournament starts.</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${formats.map(f => `
                        <button
                            data-action="pick-format"
                            data-format="${f.key}"
                            class="text-left p-4 rounded-xl border-2 ${this.state.format === f.key ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'} transition"
                        >
                            <div class="flex items-center gap-3 mb-1">
                                <span class="text-2xl">${f.emoji}</span>
                                <span class="font-semibold text-gray-900">${f.name}</span>
                            </div>
                            <p class="text-xs text-gray-600">${f.description}</p>
                            ${f.hint ? `<p class="text-xs text-gray-400 mt-1">${f.hint}</p>` : ''}
                        </button>
                    `).join('')}
                </div>
                <div class="mt-6 flex justify-end">
                    <button
                        data-action="next"
                        ${this.state.format ? '' : 'disabled'}
                        class="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition"
                    >Continue →</button>
                </div>
            </div>
        `;
    },

    _renderStep2() {
        const fmt = FORMAT_CONFIG[this.state.format] || {};
        const openEnabled = TOURNAMENTS_CONFIG.FEATURE_FLAGS.OPEN_REGISTRATION_ENABLED
            && (fmt.supportedModes || []).includes('open');
        const openCaption = openEnabled
            ? 'Players find and register for your tournament. They must have a verified Playtomic profile. Optional entry fee.'
            : 'Coming in the next update — Playtomic verification and Stripe payments are being wired up.';

        return `
            <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 class="text-xl font-bold text-gray-900 mb-1">How should players join?</h2>
                <p class="text-sm text-gray-600 mb-6">Pick how registrations work. You can't change this after the tournament is created.</p>

                <div class="space-y-3">
                    <button
                        data-action="pick-mode"
                        data-mode="names_only"
                        class="w-full text-left p-4 rounded-xl border-2 ${this.state.registrationMode === 'names_only' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'} transition"
                    >
                        <div class="flex items-start gap-3">
                            <div class="text-2xl">✍️</div>
                            <div class="flex-1">
                                <div class="font-semibold text-gray-900 mb-0.5">I'll enter the player names myself</div>
                                <p class="text-sm text-gray-600">Fastest. Same as today's Quick Play. No sign-up needed for anyone — you control everything.</p>
                            </div>
                        </div>
                    </button>

                    <button
                        data-action="pick-mode"
                        data-mode="open"
                        ${openEnabled ? '' : 'disabled'}
                        class="w-full text-left p-4 rounded-xl border-2 ${this.state.registrationMode === 'open' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'} ${openEnabled ? '' : 'opacity-60 cursor-not-allowed'} transition"
                    >
                        <div class="flex items-start gap-3">
                            <div class="text-2xl">🌍</div>
                            <div class="flex-1">
                                <div class="font-semibold text-gray-900 mb-0.5 flex items-center gap-2">
                                    Open for registration
                                    ${openEnabled ? '' : '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Coming soon</span>'}
                                </div>
                                <p class="text-sm text-gray-600">${openCaption}</p>
                            </div>
                        </div>
                    </button>
                </div>

                <div class="mt-6 flex justify-between">
                    <button data-action="back" class="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">← Back</button>
                    <button
                        data-action="next"
                        ${this.state.registrationMode ? '' : 'disabled'}
                        class="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition"
                    >Continue →</button>
                </div>
            </div>
        `;
    },

    _renderStep3() {
        const fmt = FORMAT_CONFIG[this.state.format] || {};
        const isNamesOnly = this.state.registrationMode === 'names_only';
        const defaultCount = isNamesOnly
            ? (this.state.namesOnly.playerCount || (fmt.defaults && fmt.minPlayers) || 8)
            : null;

        return `
            <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 class="text-xl font-bold text-gray-900 mb-1">Details</h2>
                <p class="text-sm text-gray-600 mb-6">${fmt.name} — ${isNamesOnly ? 'you\'ll enter player names yourself' : 'open registration'}</p>

                <!-- Name -->
                <label class="block mb-4">
                    <span class="text-sm font-semibold text-gray-800 block mb-1">Tournament name</span>
                    <input
                        data-input="name"
                        type="text"
                        maxlength="100"
                        placeholder="Friday night ${fmt.name?.toLowerCase() || 'tournament'}"
                        value="${Components._esc(this.state.name)}"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </label>

                ${isNamesOnly ? this._renderStep3NamesOnly(fmt, defaultCount) : this._renderStep3OpenReg(fmt)}

                <!-- Location (always optional in Phase 0; required in open-reg Phase C) -->
                <div class="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div class="flex items-start justify-between gap-3 mb-3">
                        <div>
                            <div class="text-sm font-semibold text-gray-800">Location</div>
                            <p class="text-xs text-gray-600">
                                ${isNamesOnly
                                    ? 'Optional. Adding a postcode lets you publish this tournament on the public browser.'
                                    : 'Required for open registration.'}
                            </p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                            data-input="postcode"
                            type="text"
                            maxlength="10"
                            placeholder="Postcode"
                            value="${Components._esc(this.state.location?.postcode || '')}"
                            class="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autocomplete="postal-code"
                        />
                        <input
                            data-input="venue"
                            type="text"
                            maxlength="100"
                            placeholder="Venue (optional)"
                            value="${Components._esc(this.state.location?.venue || '')}"
                            class="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    ${isNamesOnly ? `
                        <label class="flex items-center gap-2 mt-3 cursor-pointer">
                            <input
                                data-input="publish-public"
                                type="checkbox"
                                ${this.state.publishPublic ? 'checked' : ''}
                                class="w-4 h-4 accent-blue-600"
                            />
                            <span class="text-sm text-gray-700">Publish to the public tournament browser</span>
                        </label>
                    ` : ''}
                </div>

                <div class="mt-6 flex justify-between">
                    <button data-action="back" class="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">← Back</button>
                    <button
                        data-action="create"
                        class="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:bg-gray-300"
                    >Create tournament</button>
                </div>
            </div>
        `;
    },

    _renderStep3NamesOnly(fmt, defaultCount) {
        const isTeam = fmt.rule === 'teams';
        const label = isTeam ? 'Number of teams' : 'Number of players';
        const min = isTeam ? fmt.minTeams : fmt.minPlayers;
        const max = isTeam ? fmt.maxTeams : fmt.maxPlayers;
        return `
            <label class="block mb-4">
                <span class="text-sm font-semibold text-gray-800 block mb-1">${label}</span>
                <input
                    data-input="player-count"
                    type="number"
                    min="${min}"
                    max="${max}"
                    value="${defaultCount}"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p class="text-xs text-gray-500 mt-1">${fmt.hint || ''}</p>
            </label>
        `;
    },

    _renderStep3OpenReg(fmt) {
        const isTeam = fmt.registrationUnit === 'pair' || fmt.rule === 'teams';
        const label = isTeam ? 'Max number of pairs' : 'Max number of players';
        const limitTypeOptions = (fmt.supportsRatingLimit || [])
            .map(t => `<option value="${t}" ${this.state.ratingLimit?.type === t ? 'selected' : ''}>${t === 'combined' ? 'Combined' : 'Individual'}</option>`)
            .join('');

        return `
            <div class="space-y-4">
                <!-- Date + deadline -->
                <div class="grid sm:grid-cols-2 gap-3">
                    <label class="block">
                        <span class="text-sm font-semibold text-gray-800 block mb-1">Start date</span>
                        <input data-input="start-date" type="datetime-local"
                            value="${this.state.startDate || ''}"
                            class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </label>
                    <label class="block">
                        <span class="text-sm font-semibold text-gray-800 block mb-1">Registration deadline</span>
                        <input data-input="deadline" type="datetime-local"
                            value="${this.state.registrationDeadline || ''}"
                            class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </label>
                </div>

                <!-- Max pairs / players -->
                <label class="block">
                    <span class="text-sm font-semibold text-gray-800 block mb-1">${label}</span>
                    <input data-input="max-pairs" type="number"
                        min="${isTeam ? fmt.minTeams : fmt.minPlayers}"
                        max="${isTeam ? fmt.maxTeams : fmt.maxPlayers}"
                        value="${this.state.maxPairs || (isTeam ? fmt.minTeams : fmt.minPlayers)}"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </label>

                <!-- Rating limit -->
                ${(fmt.supportsRatingLimit || []).length > 0 ? `
                    <div>
                        <span class="text-sm font-semibold text-gray-800 block mb-1">Rating limit</span>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select data-input="rating-type"
                                class="px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                <option value="none" ${this.state.ratingLimit?.type==='none'?'selected':''}>No limit</option>
                                ${limitTypeOptions}
                            </select>
                            <input data-input="rating-min" type="number" step="0.1" min="0" max="10"
                                placeholder="Min"
                                value="${this.state.ratingLimit?.min ?? ''}"
                                class="px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <input data-input="rating-max" type="number" step="0.1" min="0" max="10"
                                placeholder="Max"
                                value="${this.state.ratingLimit?.max ?? ''}"
                                class="px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Combined means the sum of both partners' ratings.</p>
                    </div>
                ` : ''}

                <!-- Match format picker for fixed-pair -->
                ${fmt.matchFormats?.length > 0 ? `
                    <div>
                        <span class="text-sm font-semibold text-gray-800 block mb-1">Match format</span>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            ${fmt.matchFormats.map(mf => `
                                <label class="cursor-pointer block p-3 rounded-xl border-2 ${this.state.matchFormat === mf ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}">
                                    <input type="radio" name="match-format" data-input="match-format" value="${mf}"
                                        ${this.state.matchFormat === mf ? 'checked' : ''} class="sr-only" />
                                    <div class="text-sm font-semibold text-gray-900">${_matchFormatLabel(mf)}</div>
                                    <div class="text-xs text-gray-500 mt-0.5">${_matchFormatHint(mf)}</div>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Entry fee -->
                <div>
                    <span class="text-sm font-semibold text-gray-800 block mb-1">Entry fee</span>
                    <div class="grid grid-cols-2 gap-2">
                        <label class="flex items-center gap-2 p-3 rounded-xl border-2 ${!this.state.entryFeeGBP ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'} cursor-pointer">
                            <input type="radio" name="fee-mode" data-input="fee-free" ${!this.state.entryFeeGBP ? 'checked' : ''} class="sr-only" />
                            <span class="text-sm font-semibold text-gray-900">Free</span>
                        </label>
                        <label class="flex items-center gap-2 p-3 rounded-xl border-2 ${this.state.entryFeeGBP > 0 ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'} cursor-pointer">
                            <input type="radio" name="fee-mode" data-input="fee-paid" ${this.state.entryFeeGBP > 0 ? 'checked' : ''} class="sr-only" />
                            <span class="text-sm font-semibold text-gray-900">Paid</span>
                        </label>
                    </div>
                    ${this.state.entryFeeGBP > 0 ? `
                        <div class="mt-2 flex items-center gap-2">
                            <span class="text-gray-500">£</span>
                            <input data-input="entry-fee" type="number" step="1" min="1" max="500"
                                value="${this.state.entryFeeGBP}"
                                class="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <span class="text-xs text-gray-500">per ${FORMAT_CONFIG[this.state.format]?.registrationUnit || 'player'}</span>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Payments go to your Stripe account. Uber Padel takes a 5% platform fee. <a href="/organiser/payouts.html" class="text-blue-600 underline">Connect Stripe →</a></p>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // -----------------------------------------------------------------------
    // Event handling
    // -----------------------------------------------------------------------

    _onClick(e) {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        switch (action) {
            case 'pick-format': {
                const format = e.target.closest('[data-format]').dataset.format;
                this.state.format = format;
                const fmt = FORMAT_CONFIG[format];
                if (fmt) {
                    // Reset mode if previous choice is no longer valid
                    const modes = fmt.supportedModes || [];
                    if (this.state.registrationMode && !modes.includes(this.state.registrationMode)) {
                        this.state.registrationMode = null;
                    }
                    // Defaults for names-only
                    this.state.namesOnly.playerCount = fmt.rule === 'teams'
                        ? fmt.minTeams
                        : Math.max(fmt.minPlayers, 8);
                    this.state.namesOnly.courts = (fmt.defaults && fmt.defaults.courts) || 2;
                }
                this._render();
                break;
            }
            case 'pick-mode': {
                const mode = e.target.closest('[data-mode]').dataset.mode;
                if (e.target.closest('[data-mode]').disabled) return;
                this.state.registrationMode = mode;
                this._render();
                break;
            }
            case 'next': {
                if (e.target.disabled) return;
                if (this.state.step < 3) {
                    this.state.step++;
                    this._render();
                }
                break;
            }
            case 'back': {
                if (this.state.step > 1) {
                    this.state.step--;
                    this._render();
                }
                break;
            }
            case 'create': {
                this._create().catch(err => {
                    console.error('Create failed:', err);
                    alert('Could not create tournament: ' + err.message);
                });
                break;
            }
        }
    },

    _onInput(e) {
        const key = e.target.dataset.input;
        if (!key) return;
        switch (key) {
            case 'name':         this.state.name = e.target.value; break;
            case 'postcode':     this._setLocation({ postcode: e.target.value }); break;
            case 'venue':        this._setLocation({ venue: e.target.value }); break;
            case 'player-count': this.state.namesOnly.playerCount = Number(e.target.value); break;
            case 'start-date':   this.state.startDate = e.target.value; break;
            case 'deadline':     this.state.registrationDeadline = e.target.value; break;
            case 'max-pairs':    this.state.maxPairs = Number(e.target.value); break;
            case 'rating-min':   this.state.ratingLimit = { ...(this.state.ratingLimit||{}), min: e.target.value === '' ? undefined : Number(e.target.value) }; break;
            case 'rating-max':   this.state.ratingLimit = { ...(this.state.ratingLimit||{}), max: e.target.value === '' ? undefined : Number(e.target.value) }; break;
            case 'entry-fee':    this.state.entryFeeGBP = Number(e.target.value) || 0; break;
        }
    },

    _onChange(e) {
        const key = e.target.dataset.input;
        if (key === 'publish-public') {
            this.state.publishPublic = e.target.checked;
        }
        if (key === 'rating-type') {
            this.state.ratingLimit = { ...(this.state.ratingLimit || {}), type: e.target.value };
            // Re-render so min/max inputs enable/disable based on type
            this._render();
        }
        if (key === 'match-format') {
            this.state.matchFormat = e.target.value;
            this._render();
        }
        if (key === 'fee-free') {
            this.state.entryFeeGBP = 0;
            this._render();
        }
        if (key === 'fee-paid') {
            this.state.entryFeeGBP = this.state.entryFeeGBP > 0 ? this.state.entryFeeGBP : 10;
            this._render();
        }
    },

    _setLocation(patch) {
        this.state.location = { ...(this.state.location || {}), ...patch };
    },

    async _create() {
        if (!this.state.format || !this.state.registrationMode) {
            throw new Error('Please complete all steps');
        }
        const fmt = FORMAT_CONFIG[this.state.format];
        if (!this.state.name) this.state.name = `${fmt.name} — ${new Date().toLocaleDateString('en-GB')}`;

        // Validate player count for names-only
        if (this.state.registrationMode === 'names_only') {
            const v = validateFormatCount(this.state.namesOnly.playerCount, this.state.format);
            if (!v.valid) throw new Error(v.error);
        }

        // Resolve postcode if provided
        let resolvedLocation = null;
        if (this.state.location?.postcode) {
            const geo = await PostcodeService.lookup(this.state.location.postcode);
            if (geo) {
                resolvedLocation = {
                    postcode: geo.postcode,
                    lat: geo.lat,
                    lng: geo.lng,
                    venue: this.state.location.venue || null
                };
            } else {
                // Fallback: keep the typed string but no coordinates
                resolvedLocation = {
                    postcode: this.state.location.postcode,
                    venue: this.state.location.venue || null
                };
            }
        }

        // Organiser identity (anonymous auth for names-only)
        initializeFirebase();
        let organizerUid = null;
        try {
            if (typeof OrganizerAuth !== 'undefined') {
                organizerUid = await OrganizerAuth.ensureUid();
            }
        } catch (_) { /* fall through — writes still OK without UID for now */ }

        const organiserKey = generateOrganiserKey();
        const id = generateTournamentId();
        const now = new Date().toISOString();

        const meta = {
            format: this.state.format,
            name: this.state.name,
            organizerUid,
            organiserKey,
            registrationMode: this.state.registrationMode,
            isPublic: this.state.registrationMode === 'open'
                   || (this.state.registrationMode === 'names_only' && this.state.publishPublic === true),
            mode: 'anyone',
            status: this.state.registrationMode === 'open'
                ? TOURNAMENTS_CONFIG.LIFECYCLE.OPEN_FOR_REGISTRATION
                : TOURNAMENTS_CONFIG.LIFECYCLE.DRAFT,
            createdAt: now,
            updatedAt: now
        };
        if (resolvedLocation) meta.location = resolvedLocation;

        // Open-registration fields
        if (this.state.registrationMode === 'open') {
            const f = FORMAT_CONFIG[this.state.format];
            meta.registrationUnit = f.registrationUnit || 'individual';
            if (this.state.startDate)            meta.startDate = new Date(this.state.startDate).toISOString();
            if (this.state.registrationDeadline) meta.registrationDeadline = new Date(this.state.registrationDeadline).toISOString();
            if (this.state.maxPairs) {
                if (meta.registrationUnit === 'pair') meta.maxPairs = this.state.maxPairs;
                else meta.maxPlayers = this.state.maxPairs;
            }
            meta.entryFeeGBP = Math.max(0, Number(this.state.entryFeeGBP) || 0);
            meta.currency = 'GBP';
            const limit = this.state.ratingLimit || {};
            meta.ratingLimit = { type: limit.type || 'none' };
            if (typeof limit.min === 'number') meta.ratingLimit.min = limit.min;
            if (typeof limit.max === 'number') meta.ratingLimit.max = limit.max;
            if (f.matchFormats?.length) {
                meta.formatConfig = {
                    matchFormat: this.state.matchFormat || (f.defaults?.matchFormat) || f.matchFormats[0],
                    pointsPerMatch: (f.defaults?.pointsPerMatch) || 24
                };
            }
        }

        // Names-only roster stub (organiser will fill names on the play page)
        let namesOnlyRoster = null;
        if (this.state.registrationMode === 'names_only') {
            const count = this.state.namesOnly.playerCount;
            const names = {};
            for (let i = 0; i < count; i++) names[i] = `Player ${i + 1}`;
            namesOnlyRoster = { playerNames: names };
            meta.playerCount = count;
        }

        const payload = { meta };
        if (namesOnlyRoster) payload.namesOnlyRoster = namesOnlyRoster;

        const ok = await createTournamentInFirebase(id, payload);
        if (!ok) throw new Error('Firebase write failed');

        // Store local pointer
        try {
            const key = TOURNAMENTS_CONFIG.MY_TOURNAMENTS_KEY;
            const prev = JSON.parse(localStorage.getItem(key) || '[]');
            prev.unshift({ id, name: meta.name, format: meta.format, organiserKey, createdAt: now });
            localStorage.setItem(key, JSON.stringify(prev.slice(0, TOURNAMENTS_CONFIG.MAX_STORED_TOURNAMENTS)));
        } catch (_) { /* ignore */ }

        // For names-only tournaments we hand off to the legacy play page for the
        // chosen format — the engines haven't been ported to the unified root
        // yet (that comes in a later turn). The play page will still function
        // because the organiser key + id land in the share URL.
        // For now redirect to the manage page, where the organiser can see
        // the link and (in the next iteration) launch play.
        const url = TournamentsRouter.getUrl('manage', id, organiserKey);
        window.location.href = url;
    }
};

// Tiny helpers for match-format tiles
function _matchFormatLabel(mf) {
    switch (mf) {
        case 'round-robin': return 'Round-robin';
        case 'groups+ko':   return 'Groups + knockout';
        case 'knockout':    return 'Single-elim';
        default:            return mf;
    }
}
function _matchFormatHint(mf) {
    switch (mf) {
        case 'round-robin': return 'Every pair plays every other pair once.';
        case 'groups+ko':   return 'Group stage, then knockout bracket.';
        case 'knockout':    return 'Single-elim bracket, seeded by rating.';
        default:            return '';
    }
}

if (typeof window !== 'undefined') {
    window.CreateWizard = CreateWizard;
}
