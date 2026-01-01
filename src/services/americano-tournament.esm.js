/**
 * americano-tournament.esm.js - Americano Tournament (ES Module stub)
 */

import { BaseTournament } from './base-tournament.esm.js';

export class AmericanoTournament extends BaseTournament {
    constructor(options = {}) {
        super('AMERICANO', options);
    }
}

export default AmericanoTournament;
