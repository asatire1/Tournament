/**
 * permissions.esm.js - Permission System (ES Module)
 * 
 * Role-based access control for tournament operations.
 * 
 * @module core/permissions
 */

/**
 * Role hierarchy (higher index = more permissions)
 */
export const ROLES = {
    GUEST: 0,
    REGISTERED: 1,
    VERIFIED: 2,
    ADMIN: 3
};

/**
 * Permission definitions
 */
export const PERMISSIONS = {
    // Tournament viewing
    VIEW_TOURNAMENT: 'VIEW_TOURNAMENT',
    VIEW_STANDINGS: 'VIEW_STANDINGS',
    
    // Tournament creation
    CREATE_TOURNAMENT: 'CREATE_TOURNAMENT',
    CREATE_REGISTERED_TOURNAMENT: 'CREATE_REGISTERED_TOURNAMENT',
    CREATE_LEVEL_BASED_TOURNAMENT: 'CREATE_LEVEL_BASED_TOURNAMENT',
    
    // Tournament management
    EDIT_TOURNAMENT: 'EDIT_TOURNAMENT',
    DELETE_TOURNAMENT: 'DELETE_TOURNAMENT',
    MANAGE_SCORES: 'MANAGE_SCORES',
    
    // Player management
    JOIN_TOURNAMENT: 'JOIN_TOURNAMENT',
    JOIN_LEVEL_BASED_TOURNAMENT: 'JOIN_LEVEL_BASED_TOURNAMENT',
    REGISTER_FOR_TOURNAMENT: 'REGISTER_FOR_TOURNAMENT',
    
    // Admin permissions
    VERIFY_PLAYERS: 'VERIFY_PLAYERS',
    MANAGE_USERS: 'MANAGE_USERS',
    VIEW_ALL_TOURNAMENTS: 'VIEW_ALL_TOURNAMENTS'
};

/**
 * Permission matrix - which roles have which permissions
 */
const PERMISSION_MATRIX = {
    [ROLES.GUEST]: [
        PERMISSIONS.VIEW_TOURNAMENT,
        PERMISSIONS.VIEW_STANDINGS,
        PERMISSIONS.CREATE_TOURNAMENT,
        PERMISSIONS.JOIN_TOURNAMENT
    ],
    
    [ROLES.REGISTERED]: [
        PERMISSIONS.VIEW_TOURNAMENT,
        PERMISSIONS.VIEW_STANDINGS,
        PERMISSIONS.CREATE_TOURNAMENT,
        PERMISSIONS.CREATE_REGISTERED_TOURNAMENT,
        PERMISSIONS.JOIN_TOURNAMENT,
        PERMISSIONS.REGISTER_FOR_TOURNAMENT
    ],
    
    [ROLES.VERIFIED]: [
        PERMISSIONS.VIEW_TOURNAMENT,
        PERMISSIONS.VIEW_STANDINGS,
        PERMISSIONS.CREATE_TOURNAMENT,
        PERMISSIONS.CREATE_REGISTERED_TOURNAMENT,
        PERMISSIONS.CREATE_LEVEL_BASED_TOURNAMENT,
        PERMISSIONS.JOIN_TOURNAMENT,
        PERMISSIONS.JOIN_LEVEL_BASED_TOURNAMENT,
        PERMISSIONS.REGISTER_FOR_TOURNAMENT
    ],
    
    [ROLES.ADMIN]: Object.values(PERMISSIONS) // Admins have all permissions
};

/**
 * Permissions manager
 */
class PermissionsManager {
    /**
     * Check if user has a specific permission
     * @param {object} user - User object with role
     * @param {string} permission - Permission to check
     * @returns {boolean}
     */
    can(user, permission) {
        const role = this.getUserRole(user);
        const permissions = PERMISSION_MATRIX[role] || PERMISSION_MATRIX[ROLES.GUEST];
        return permissions.includes(permission);
    }
    
    /**
     * Check if user has a specific role or higher
     * @param {object} user
     * @param {number} requiredRole
     * @returns {boolean}
     */
    hasRole(user, requiredRole) {
        const userRole = this.getUserRole(user);
        return userRole >= requiredRole;
    }
    
    /**
     * Get user's role level
     * @param {object} user
     * @returns {number}
     */
    getUserRole(user) {
        if (!user) return ROLES.GUEST;
        if (user.isAdmin) return ROLES.ADMIN;
        if (user.isVerified) return ROLES.VERIFIED;
        if (user.uid || user.id) return ROLES.REGISTERED;
        return ROLES.GUEST;
    }
    
    /**
     * Get role name
     * @param {number} role
     * @returns {string}
     */
    getRoleName(role) {
        return Object.keys(ROLES).find(key => ROLES[key] === role) || 'GUEST';
    }
    
    /**
     * Check if user can join a tournament
     * @param {object} user
     * @param {object} tournament
     * @returns {{ allowed: boolean, reason: string | null }}
     */
    canJoinTournament(user, tournament) {
        const mode = tournament?.accessMode || tournament?.mode || 'anyone';
        
        switch (mode) {
            case 'anyone':
                return { allowed: true, reason: null };
                
            case 'registered':
                if (!this.hasRole(user, ROLES.REGISTERED)) {
                    return { 
                        allowed: false, 
                        reason: 'You must be logged in to join this tournament' 
                    };
                }
                return { allowed: true, reason: null };
                
            case 'level-based':
                if (!this.hasRole(user, ROLES.VERIFIED)) {
                    return { 
                        allowed: false, 
                        reason: 'You must be verified to join level-based tournaments' 
                    };
                }
                
                // Check level criteria
                if (tournament.levelCriteria && user.level) {
                    const { min, max } = tournament.levelCriteria;
                    if (user.level < min || user.level > max) {
                        return {
                            allowed: false,
                            reason: `Your level (${user.level}) is outside the required range (${min}-${max})`
                        };
                    }
                }
                return { allowed: true, reason: null };
                
            default:
                return { allowed: true, reason: null };
        }
    }
    
    /**
     * Get permissions for tournament creation
     * @param {object} user
     * @returns {object}
     */
    getCreationPermissions(user) {
        return {
            anyone: this.can(user, PERMISSIONS.CREATE_TOURNAMENT),
            registered: this.can(user, PERMISSIONS.CREATE_REGISTERED_TOURNAMENT),
            levelBased: this.can(user, PERMISSIONS.CREATE_LEVEL_BASED_TOURNAMENT)
        };
    }
    
    /**
     * Check all required permissions
     * @param {object} user
     * @param {string[]} permissions
     * @returns {boolean}
     */
    canAll(user, permissions) {
        return permissions.every(p => this.can(user, p));
    }
    
    /**
     * Check any of the permissions
     * @param {object} user
     * @param {string[]} permissions
     * @returns {boolean}
     */
    canAny(user, permissions) {
        return permissions.some(p => this.can(user, p));
    }
}

// Create singleton instance
export const Permissions = new PermissionsManager();

export default Permissions;
