/**
 * crypto.js - Secure Cryptographic Utilities
 * Uses Web Crypto API for secure hashing
 * 
 * @module shared/crypto
 */

const CryptoUtils = {
    /**
     * Hash a passcode using SHA-256
     * 
     * @param {string} passcode - The passcode to hash
     * @returns {Promise<string>} The hex-encoded hash
     */
    async hashPasscode(passcode) {
        if (!passcode) {
            return '';
        }
        
        // Use Web Crypto API for secure hashing
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(passcode);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) {
                console.warn('Web Crypto API failed, using fallback:', e);
                return this._fallbackHash(passcode);
            }
        }
        
        // Fallback for environments without Web Crypto
        return this._fallbackHash(passcode);
    },
    
    /**
     * Synchronous hash for backwards compatibility
     * Note: Less secure than async version, use hashPasscode when possible
     * 
     * @param {string} passcode - The passcode to hash
     * @returns {string} The hash
     */
    hashPasscodeSync(passcode) {
        return this._fallbackHash(passcode);
    },
    
    /**
     * Verify a passcode against a stored hash
     * 
     * @param {string} passcode - The passcode to verify
     * @param {string} storedHash - The stored hash to compare against
     * @returns {Promise<boolean>} True if the passcode matches
     */
    async verifyPasscode(passcode, storedHash) {
        if (!passcode || !storedHash) {
            return false;
        }
        
        // Handle legacy base64 encoded passcodes
        if (this._isBase64(storedHash)) {
            try {
                const decoded = atob(storedHash);
                if (decoded === passcode) {
                    return true;
                }
            } catch (e) {
                // Not valid base64, continue with hash comparison
            }
        }
        
        // Handle legacy simple hash (numeric hex)
        if (storedHash.length <= 8 && /^-?[0-9a-f]+$/i.test(storedHash)) {
            const legacyHash = this._legacyHash(passcode);
            if (legacyHash === storedHash) {
                return true;
            }
        }
        
        // Compare with SHA-256 hash
        const hash = await this.hashPasscode(passcode);
        return hash === storedHash;
    },
    
    /**
     * Check if a string is base64 encoded
     * @private
     */
    _isBase64(str) {
        if (!str || str.length < 4) return false;
        try {
            return btoa(atob(str)) === str;
        } catch (e) {
            return false;
        }
    },
    
    /**
     * Legacy hash function for backwards compatibility
     * DO NOT use for new hashes - only for verifying old data
     * @private
     */
    _legacyHash(passcode) {
        let hash = 0;
        for (let i = 0; i < passcode.length; i++) {
            const char = passcode.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    },
    
    /**
     * Fallback hash for environments without Web Crypto
     * Uses a better algorithm than the legacy hash
     * @private
     */
    _fallbackHash(passcode) {
        // Simple but better hash using multiple passes
        let hash1 = 0;
        let hash2 = 0;
        
        for (let i = 0; i < passcode.length; i++) {
            const char = passcode.charCodeAt(i);
            hash1 = ((hash1 << 5) - hash1) + char;
            hash1 = hash1 & hash1;
            hash2 = ((hash2 << 7) + hash2) ^ char;
            hash2 = hash2 & hash2;
        }
        
        // Combine both hashes for more entropy
        const combined = Math.abs(hash1).toString(16).padStart(8, '0') + 
                        Math.abs(hash2).toString(16).padStart(8, '0');
        return combined;
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CryptoUtils };
}

if (typeof window !== 'undefined') {
    window.CryptoUtils = CryptoUtils;
}
