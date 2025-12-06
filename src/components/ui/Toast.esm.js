/**
 * Toast.esm.js - Toast Component (ES Module)
 */

export const TOAST_TYPES = {
    default: { icon: '', bgClass: 'bg-gray-800', textClass: 'text-white' },
    success: { icon: '✅', bgClass: 'bg-green-600', textClass: 'text-white' },
    error: { icon: '❌', bgClass: 'bg-red-600', textClass: 'text-white' },
    warning: { icon: '⚠️', bgClass: 'bg-amber-500', textClass: 'text-white' },
    info: { icon: 'ℹ️', bgClass: 'bg-blue-600', textClass: 'text-white' }
};

class ToastManager {
    constructor() {
        this._container = null;
        this._toasts = [];
        this._config = { containerId: 'toast-container', duration: 2500, position: 'bottom-right', maxToasts: 5 };
    }
    
    init(options = {}) {
        this._config = { ...this._config, ...options };
        this._ensureContainer();
    }
    
    _ensureContainer() {
        let container = document.getElementById(this._config.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this._config.containerId;
            container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
            document.body.appendChild(container);
        }
        this._container = container;
    }
    
    show(message, options = {}) {
        this._ensureContainer();
        const type = options.type || 'default';
        const typeConfig = TOAST_TYPES[type] || TOAST_TYPES.default;
        const duration = options.duration ?? this._config.duration;
        
        const toast = document.createElement('div');
        toast.className = `${typeConfig.bgClass} ${typeConfig.textClass} px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in`;
        toast.innerHTML = `${typeConfig.icon ? `<span>${typeConfig.icon}</span>` : ''}<span>${message}</span>`;
        
        this._container.insertBefore(toast, this._container.firstChild);
        this._toasts.push(toast);
        
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }
        
        return toast;
    }
    
    dismiss(toast) {
        if (!toast || !toast.parentElement) return;
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }
    
    clear() {
        this._toasts.forEach(t => t.remove());
        this._toasts = [];
    }
    
    success(message, options = {}) { return this.show(message, { ...options, type: 'success' }); }
    error(message, options = {}) { return this.show(message, { ...options, type: 'error' }); }
    warning(message, options = {}) { return this.show(message, { ...options, type: 'warning' }); }
    info(message, options = {}) { return this.show(message, { ...options, type: 'info' }); }
}

export const Toast = new ToastManager();
export function showToast(message) {
    if (message.startsWith('✅')) Toast.success(message.replace('✅', '').trim());
    else if (message.startsWith('❌')) Toast.error(message.replace('❌', '').trim());
    else Toast.show(message);
}

if (typeof window !== 'undefined') {
    window.Toast = Toast;
    window.showToast = showToast;
}

export default Toast;
