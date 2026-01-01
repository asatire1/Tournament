/**
 * permissions.js - Centralized Permission System
 * Role definitions and permission checks for UberPadel
 * 
 * @module core/permissions
 */

/**
 * User roles in order of privilege (lowest to highest)
 */
const ROLES = {
    GUEST: 'guest',
    REGISTERED: 'registered',
    VERIFIED: 'verified',
    ADMIN: 'admin'
};

/**
 * Role hierarchy for comparison
 */
const ROLE_HIERARCHY = {
    [ROLES.GUEST]: 0,
    [ROLES.REGISTERED]: 1,
    [ROLES.VERIFIED]: 2,
    [ROLES.ADMIN]: 3
};

/**
 * Permission definitions
 * Maps permission names to array of roles that have that permission
 */
const PERMISSIONS = {
    // Tournament viewing
    VIEW_ALL_TOURNAMENTS: [ROLES.GUEST, ROLES.REGISTERED, ROLES.VERIFIED, ROLES.ADMIN],
    VIEW_TOURNAMENT_DETAILS: [ROLES.GUEST, ROLES.REGISTERED, ROLES.VERIFIED, ROLES.ADMIN],
    
    // Tournament creation
    CREATE_TOURNAMENT: [ROLES.GUEST, ROLES.REGISTERED, ROLES.VERIFIED, ROLES.ADMIN],
    CREATE_ANYONE_TOURNAMENT: [ROLES.GUEST, ROLES.REGISTERED, ROLES.VERIFIED, ROLES.ADMIN],
    CREATE_REGISTERED_TOURNAMENT: [ROLES.REGISTERED, ROLES.VERIFIED, ROLES.ADMIN],
    CREATE_LEVEL_BASED_TOURNAMENT: [ROLES.VERIFIED, ROLES.ADMIN],
    
    // Tournament joining
    JOIN_ANYONE_TOURNAMENT: [ROLES.GUEST, ROLES.REGISTERED, ROLES.VERIFIED, ROLES.ADMIN],
    JOIN_REGISTERED_TOURNAMENT: [ROLES.REGISTERED, ROLES.VERIFIED, ROLES.ADMIN],
    JOIN_LEVEL_BASED_TOURNAMENT: [ROLES.VERIFIED, ROLES.ADMIN],
    
    // Tournament management
    EDIT_OWN_TOURNAMENT: [ROLES.GUEST, ROLES.REGISTERED, ROLES.VERIFIED, ROLES.ADMIN],
    DELETE_OWN_TOURNAMENT: [ROLES.GUEST, ROLES.REGISTERED, ROLES.VERIFIED, ROLES.ADMIN],
    
    // User management
    VIEW_OWN_PROFILE: [ROLES.REGISTERED, ROLES.VERIFIED, ROLES.ADMIN],
    EDIT_OWN_PROFILE: [ROLES.REGISTERED, ROLES.VERIFIED, ROLES.ADMIN],
    
    // Admin permissions
    VERIFY_PLAYERS: [ROLES.ADMIN],
    VIEW_ALL_USERS: [ROLES.ADMIN],
    EDIT_ANY_USER: [ROLES.ADMIN],
    DELETE_ANY_TOURNAMENT: [ROLES.ADMIN],
    VIEW_ADMIN_PANEL: [ROLES.ADMIN]
};

/**
 * Tournament access modes
 */
const TOURNAMENT_MODES = {
    ANYONE: 'anyone',
    REGISTERED: 'registered',
    LEVEL_BASED: 'level-based'
};

/**
 * Custom error for permission violations
 */
class PermissionError extends Error {
    constructor(message, permission = null, requiredRole = null) {
        super(message);
        this.name = 'PermissionError';
        this.permission = permission;
        this.requiredRole = requiredRole;
    }
}

/**
 * Permissions utility object
 */
const Permissions = {
    /**
     * Get user's effective role
     * @param {object|null} user - User object
     * @returns {string} Role constant
     */
    getRole(user) {
        if (!user) return ROLES.GUEST;
        if (user.type === 'guest') return ROLES.GUEST;
        if (user.isAdmin) return ROLES.ADMIN;
        if (user.status === 'verified') return ROLES.VERIFIED;
        if (user.type === 'registered') return ROLES.REGISTERED;
        return ROLES.GUEST;
    },

    /**
     * Get role's hierarchy level
     * @param {string} role - Role constant
     * @returns {number} Hierarchy level
     */
    getRoleLevel(role) {
        return ROLE_HIERARCHY[role] ?? 0;
    },

    /**
     * Check if user has a specific permission
     * @param {object|null} user - User object
     * @param {string} permission - Permission name
     * @returns {boolean}
     */
    can(user, permission) {
        const role = this.getRole(user);
        const allowedRoles = PERMISSIONS[permission];
        
        if (!allowedRoles) {
            console.warn(`Unknown permission: ${permission}`);
            return false;
        }
        
        return allowedRoles.includes(role);
    },

    /**
     * Check if user has at least a certain role level
     * @param {object|null} user - User object
     * @param {string} requiredRole - Minimum required role
     * @returns {boolean}
     */
    hasRole(user, requiredRole) {
        const userRole = this.getRole(user);
        return this.getRoleLevel(userRole) >= this.getRoleLevel(requiredRole);
    },

    /**
     * Require a permission, throw PermissionError if not met
     * @param {object|null} user - User object
     * @param {string} permission - Permission name
     * @throws {PermissionError}
     */
    require(user, permission) {
        if (!this.can(user, permission)) {
            throw new PermissionError(
                `Permission denied: ${permission}`,
                permission,
                PERMISSIONS[permission]?.[0]
            );
        }
    },

    /**
     * Require a minimum role level, throw PermissionError if not met
     * @param {object|null} user - User object
     * @param {string} requiredRole - Minimum required role
     * @throws {PermissionError}
     */
    requireRole(user, requiredRole) {
        if (!this.hasRole(user, requiredRole)) {
            const currentRole = this.getRole(user);
            throw new PermissionError(
                `Role ${requiredRole} required, current role: ${currentRole}`,
                null,
                requiredRole
            );
        }
    },

    /**
     * Check if user can join a specific tournament
     * @param {object|null} user - User object
     * @param {object} tournament - Tournament object with mode and optional levelCriteria
     * @returns {{ allowed: boolean, reason: string }}
     */
    canJoinTournament(user, tournament) {
        const mode = tournament.mode || TOURNAMENT_MODES.ANYONE;
        
        if (!user) {
            return { 
                allowed: false, 
                reason: 'Please sign in to join tournaments' 
            };
        }

        // Anyone mode - all users can join
        if (mode === TOURNAMENT_MODES.ANYONE) {
            return { allowed: true, reason: '' };
        }

        // Registered mode - guests cannot join
        if (mode === TOURNAMENT_MODES.REGISTERED) {
            if (!this.can(user, 'JOIN_REGISTERED_TOURNAMENT')) {
                return { 
                    allowed: false, 
                    reason: 'This tournament is for registered players only' 
                };
            }
            return { allowed: true, reason: '' };
        }

        // Level-based mode - verified users only, with level check
        if (mode === TOURNAMENT_MODES.LEVEL_BASED) {
            if (!this.can(user, 'JOIN_LEVEL_BASED_TOURNAMENT')) {
                if (this.getRole(user) === ROLES.GUEST) {
                    return { 
                        allowed: false, 
                        reason: 'This tournament requires verified players' 
                    };
                }
                return { 
                    allowed: false, 
                    reason: 'Your account must be verified to join level-based tournaments' 
                };
            }

            // Check level criteria if specified
            if (tournament.levelCriteria && user.playtomicLevel) {
                const level = parseFloat(user.playtomicLevel);
                const { min, max } = tournament.levelCriteria;
                
                if (level < min || level > max) {
                    return { 
                        allowed: false, 
                        reason: `Your level (${level}) is outside the required range (${min} - ${max})` 
                    };
                }
            }
            
            return { allowed: true, reason: '' };
        }

        // Unknown mode - allow by default
        return { allowed: true, reason: '' };
    },

    /**
     * Get what tournament creation modes a user can use
     * @param {object|null} user - User object
     * @returns {{ anyone: boolean, registered: boolean, levelBased: boolean }}
     */
    getCreationPermissions(user) {
        return {
            anyone: this.can(user, 'CREATE_ANYONE_TOURNAMENT'),
            registered: this.can(user, 'CREATE_REGISTERED_TOURNAMENT'),
            levelBased: this.can(user, 'CREATE_LEVEL_BASED_TOURNAMENT')
        };
    },

    /**
     * Get a human-readable label for a role
     * @param {string} role - Role constant
     * @returns {string} Human-readable label
     */
    getRoleLabel(role) {
        const labels = {
            [ROLES.GUEST]: 'Guest',
            [ROLES.REGISTERED]: 'Registered',
            [ROLES.VERIFIED]: 'Verified',
            [ROLES.ADMIN]: 'Admin'
        };
        return labels[role] || 'Unknown';
    },

    /**
     * Get role badge HTML
     * @param {object|null} user - User object
     * @returns {string} HTML for role badge
     */
    getRoleBadge(user) {
        const role = this.getRole(user);
        
        const badges = {
            [ROLES.GUEST]: '<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">👤 Guest</span>',
            [ROLES.REGISTERED]: '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">⏳ Pending</span>',
            [ROLES.VERIFIED]: '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">✓ Verified</span>',
            [ROLES.ADMIN]: '<span class="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">⚡ Admin</span>'
        };
        
        return badges[role] || badges[ROLES.GUEST];
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ROLES, 
        ROLE_HIERARCHY, 
        PERMISSIONS, 
        TOURNAMENT_MODES,
        PermissionError, 
        Permissions 
    };
}

// Make available globally for non-module usage
if (typeof window !== 'undefined') {
    window.ROLES = ROLES;
    window.PERMISSIONS = PERMISSIONS;
    window.TOURNAMENT_MODES = TOURNAMENT_MODES;
    window.PermissionError = PermissionError;
    window.Permissions = Permissions;
}
