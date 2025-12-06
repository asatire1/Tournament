/**
 * Toast.js - Toast Notification Component
 * Supports multiple toast types, positions, and stacking
 * 
 * @module components/ui/Toast
 */

/**
 * Toast configuration defaults
 */
const TOAST_DEFAULTS = {
    containerId: 'toast-container',
    duration: 2500,
    position: 'bottom-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'
    maxToasts: 5
};

/**
 * Toast types with icons and styles
 */
const TOAST_TYPES = {
    default: {
        icon: '',
        bgClass: 'bg-gray-800',
        textClass: 'text-white'
    },
    success: {
        icon: '✅',
        bgClass: 'bg-green-600',
        textClass: 'text-white'
    },
    error: {
        icon: '❌',
        bgClass: 'bg-red-600',
        textClass: 'text-white'
    },
    warning: {
        icon: '⚠️',
        bgClass: 'bg-amber-500',
        textClass: 'text-white'
    },
    info: {
        icon: 'ℹ️',
        bgClass: 'bg-blue-600',
        textClass: 'text-white'
    }
};

/**
 * Position classes
 */
const POSITION_CLASSES = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
};

/**
 * Toast utility object
 */
const Toast = {
    _container: null,
    _toasts: [],
    _config: { ...TOAST_DEFAULTS },

    /**
     * Initialize toast container
     * @param {object} options - Configuration options
     */
    init(options = {}) {
        this._config = { ...TOAST_DEFAULTS, ...options };
        this._ensureContainer();
    },

    /**
     * Ensure toast container exists
     * @private
     */
    _ensureContainer() {
        let container = document.getElementById(this._config.containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = this._config.containerId;
            document.body.appendChild(container);
        }

        // Set position classes
        const positionClass = POSITION_CLASSES[this._config.position] || POSITION_CLASSES['bottom-right'];
        container.className = `fixed ${positionClass} z-50 flex flex-col gap-2`;
        
        this._container = container;
    },

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {object} options - Toast options
     * @returns {HTMLElement} The toast element
     */
    show(message, options = {}) {
        this._ensureContainer();
        
        const type = options.type || 'default';
        const typeConfig = TOAST_TYPES[type] || TOAST_TYPES.default;
        const duration = options.duration ?? this._config.duration;
        const icon = options.icon ?? typeConfig.icon;
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `${typeConfig.bgClass} ${typeConfig.textClass} px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in transition-all duration-300`;
        toast.style.minWidth = '200px';
        toast.style.maxWidth = '400px';
        
        // Add icon and message
        toast.innerHTML = `
            ${icon ? `<span class="flex-shrink-0">${icon}</span>` : ''}
            <span class="flex-1">${message}</span>
            ${options.dismissible !== false ? `<button onclick="Toast.dismiss(this.parentElement)" class="ml-2 opacity-70 hover:opacity-100">×</button>` : ''}
        `;
        
        // Add action button if provided
        if (options.action) {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'ml-2 px-2 py-1 bg-white/20 rounded text-sm font-medium hover:bg-white/30';
            actionBtn.textContent = options.action.text;
            actionBtn.onclick = options.action.onClick;
            toast.appendChild(actionBtn);
        }

        // Add to container
        if (this._config.position.startsWith('top')) {
            this._container.appendChild(toast);
        } else {
            this._container.insertBefore(toast, this._container.firstChild);
        }
        
        this._toasts.push(toast);

        // Limit max toasts
        while (this._toasts.length > this._config.maxToasts) {
            const oldToast = this._toasts.shift();
            if (oldToast.parentElement) {
                oldToast.remove();
            }
        }

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }

        return toast;
    },

    /**
     * Dismiss a toast
     * @param {HTMLElement} toast - Toast element to dismiss
     */
    dismiss(toast) {
        if (!toast || !toast.parentElement) return;
        
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            toast.remove();
            this._toasts = this._toasts.filter(t => t !== toast);
        }, 300);
    },

    /**
     * Clear all toasts
     */
    clear() {
        this._toasts.forEach(toast => {
            if (toast.parentElement) toast.remove();
        });
        this._toasts = [];
    },

    // Convenience methods for different toast types

    /**
     * Show success toast
     * @param {string} message
     * @param {object} options
     */
    success(message, options = {}) {
        return this.show(message, { ...options, type: 'success' });
    },

    /**
     * Show error toast
     * @param {string} message
     * @param {object} options
     */
    error(message, options = {}) {
        return this.show(message, { ...options, type: 'error', duration: options.duration ?? 4000 });
    },

    /**
     * Show warning toast
     * @param {string} message
     * @param {object} options
     */
    warning(message, options = {}) {
        return this.show(message, { ...options, type: 'warning' });
    },

    /**
     * Show info toast
     * @param {string} message
     * @param {object} options
     */
    info(message, options = {}) {
        return this.show(message, { ...options, type: 'info' });
    }
};

/**
 * Backwards compatible showToast function
 * @param {string} message - Message to display
 */
function showToast(message) {
    // Auto-detect type from message prefix
    if (message.startsWith('✅')) {
        Toast.success(message.replace('✅', '').trim());
    } else if (message.startsWith('❌')) {
        Toast.error(message.replace('❌', '').trim());
    } else if (message.startsWith('⚠️')) {
        Toast.warning(message.replace('⚠️', '').trim());
    } else if (message.startsWith('ℹ️')) {
        Toast.info(message.replace('ℹ️', '').trim());
    } else {
        Toast.show(message);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Toast, showToast, TOAST_TYPES, TOAST_DEFAULTS };
}

if (typeof window !== 'undefined') {
    window.Toast = Toast;
    window.showToast = showToast;
}
