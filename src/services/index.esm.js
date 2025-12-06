/**
 * Services Entry Point (ES Module)
 * 
 * Re-exports all service modules.
 * 
 * @module services
 */

// Note: For full ES module support, the service files would need to be converted.
// This file provides a bridge for the Vite build system.

// For now, we'll create placeholder exports that work with the global versions
// when loaded via script tags alongside the module version.

/**
 * Tournament Service placeholder
 * Use the global TournamentService or import the full module
 */
export const TournamentService = {
    FORMATS: {
        AMERICANO: 'AMERICANO',
        MEXICANO: 'MEXICANO',
        TEAM_LEAGUE: 'TEAM_LEAGUE',
        MIX_TOURNAMENT: 'MIX_TOURNAMENT'
    },
    
    async create(format, options) {
        if (typeof window !== 'undefined' && window.TournamentService) {
            return window.TournamentService.create(format, options);
        }
        throw new Error('TournamentService not loaded');
    },
    
    async load(format, id) {
        if (typeof window !== 'undefined' && window.TournamentService) {
            return window.TournamentService.load(format, id);
        }
        throw new Error('TournamentService not loaded');
    },
    
    async exists(format, id) {
        if (typeof window !== 'undefined' && window.TournamentService) {
            return window.TournamentService.exists(format, id);
        }
        throw new Error('TournamentService not loaded');
    },
    
    getRecent(format, limit = 10) {
        if (typeof window !== 'undefined' && window.TournamentService) {
            return window.TournamentService.getRecent(format, limit);
        }
        return [];
    },
    
    getAllRecent(limit = 10) {
        if (typeof window !== 'undefined' && window.TournamentService) {
            return window.TournamentService.getAllRecent(limit);
        }
        return [];
    }
};

/**
 * User Service placeholder
 */
export const UserService = {
    USER_STATUS: {
        PENDING: 'pending',
        VERIFIED: 'verified',
        SUSPENDED: 'suspended'
    },
    
    async getUser(id) {
        if (typeof window !== 'undefined' && window.UserService) {
            return window.UserService.getUser(id);
        }
        throw new Error('UserService not loaded');
    },
    
    async createUser(data) {
        if (typeof window !== 'undefined' && window.UserService) {
            return window.UserService.createUser(data);
        }
        throw new Error('UserService not loaded');
    },
    
    async updateUser(id, updates) {
        if (typeof window !== 'undefined' && window.UserService) {
            return window.UserService.updateUser(id, updates);
        }
        throw new Error('UserService not loaded');
    }
};

// Re-export tournament classes (these would be properly imported in a full conversion)
export { BaseTournament } from './base-tournament.esm.js';
export { AmericanoTournament } from './americano-tournament.esm.js';
export { MexicanoTournament } from './mexicano-tournament.esm.js';

export default { TournamentService, UserService };
