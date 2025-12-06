/**
 * Modal.esm.js - Modal Component (ES Module wrapper)
 * 
 * Re-exports the Modal component for ES module usage.
 * The actual implementation is in Modal.js (non-module version).
 */

// Configuration defaults
export const MODAL_DEFAULTS = {
    containerId: 'modal-container',
    closeOnBackdrop: true,
    closeOnEscape: true,
    animation: 'slide-up',
    size: 'md'
};

export const MODAL_SIZES = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4'
};

const MODAL_ANIMATIONS = {
    'slide-up': 'animate-slide-up',
    'fade': 'animate-fade-in',
    'scale': 'animate-scale-in'
};

/**
 * Modal utility class
 */
class ModalManager {
    constructor() {
        this._activeModal = null;
        this._escapeHandler = null;
    }

    show(options = {}) {
        const config = { ...MODAL_DEFAULTS, ...options };
        const container = document.getElementById(config.containerId);
        
        if (!container) {
            console.error(`Modal container #${config.containerId} not found`);
            return this;
        }

        const sizeClass = MODAL_SIZES[config.size] || MODAL_SIZES.md;
        const animClass = MODAL_ANIMATIONS[config.animation] || '';

        let headerHTML = '';
        if (config.title || config.icon) {
            const gradientClass = config.headerGradient || 'from-blue-600 to-purple-600';
            headerHTML = `
                <div class="bg-gradient-to-r ${gradientClass} px-6 py-5">
                    <h2 class="text-xl font-bold text-white">
                        ${config.icon ? `${config.icon} ` : ''}${config.title || ''}
                    </h2>
                    ${config.subtitle ? `<p class="text-white/70 text-sm mt-1">${config.subtitle}</p>` : ''}
                </div>
            `;
        }

        let footerHTML = '';
        if (config.buttons && config.buttons.length > 0) {
            const buttonsHTML = config.buttons.map(btn => {
                const btnClass = btn.primary 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700';
                const onClick = btn.onClick || 'Modal.close()';
                return `<button onclick="${onClick}" class="flex-1 px-5 py-3 ${btnClass} rounded-xl font-medium transition-colors">${btn.text}</button>`;
            }).join('');
            
            footerHTML = `<div class="flex gap-3 p-6 pt-0">${buttonsHTML}</div>`;
        }

        const modalHTML = `
            <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
                 id="modal-backdrop"
                 ${config.closeOnBackdrop ? 'onclick="if(event.target === this) Modal.close()"' : ''}>
                <div class="bg-white rounded-3xl shadow-2xl ${sizeClass} w-full overflow-hidden ${animClass}" id="modal-content">
                    ${headerHTML}
                    <div class="p-6" id="modal-body">
                        ${config.content || ''}
                    </div>
                    ${footerHTML}
                </div>
            </div>
        `;

        container.innerHTML = modalHTML;
        this._activeModal = config;

        if (config.closeOnEscape) {
            this._escapeHandler = (e) => {
                if (e.key === 'Escape') this.close();
            };
            document.addEventListener('keydown', this._escapeHandler);
        }

        setTimeout(() => {
            const firstInput = container.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);

        if (config.onOpen) config.onOpen();

        return this;
    }

    alert(message, options = {}) {
        return this.show({
            title: options.title || 'Alert',
            icon: options.icon || '⚠️',
            content: `<p class="text-gray-600">${message}</p>`,
            buttons: [
                { text: options.buttonText || 'OK', primary: true, onClick: 'Modal.close()' }
            ],
            ...options
        });
    }

    confirm(message, options = {}) {
        return new Promise((resolve) => {
            window._modalConfirmResolve = resolve;
            
            this.show({
                title: options.title || 'Confirm',
                icon: options.icon || '❓',
                content: `<p class="text-gray-600">${message}</p>`,
                headerGradient: options.danger ? 'from-red-500 to-orange-500' : 'from-blue-600 to-purple-600',
                buttons: [
                    { text: options.cancelText || 'Cancel', onClick: 'Modal.close(); window._modalConfirmResolve(false)' },
                    { text: options.confirmText || 'Confirm', primary: true, onClick: 'Modal.close(); window._modalConfirmResolve(true)' }
                ],
                closeOnBackdrop: false,
                closeOnEscape: false,
                ...options
            });
        });
    }

    prompt(message, options = {}) {
        return new Promise((resolve) => {
            window._modalPromptResolve = resolve;
            
            const inputId = 'modal-prompt-input';
            const content = `
                <p class="text-gray-600 mb-4">${message}</p>
                <input type="${options.type || 'text'}" 
                       id="${inputId}"
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                       placeholder="${options.placeholder || ''}"
                       value="${options.defaultValue || ''}"
                       onkeypress="if(event.key === 'Enter') { window._modalPromptResolve(this.value); Modal.close(); }" />
            `;
            
            this.show({
                title: options.title || 'Input',
                icon: options.icon || '✏️',
                content,
                buttons: [
                    { text: options.cancelText || 'Cancel', onClick: 'Modal.close(); window._modalPromptResolve(null)' },
                    { text: options.confirmText || 'OK', primary: true, onClick: `Modal.close(); window._modalPromptResolve(document.getElementById('${inputId}').value)` }
                ],
                closeOnBackdrop: false,
                ...options
            });
        });
    }

    setContent(content) {
        const body = document.getElementById('modal-body');
        if (body) body.innerHTML = content;
        return this;
    }

    close() {
        const container = document.getElementById(MODAL_DEFAULTS.containerId);
        if (container) container.innerHTML = '';
        
        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
            this._escapeHandler = null;
        }

        if (this._activeModal && this._activeModal.onClose) {
            this._activeModal.onClose();
        }
        
        this._activeModal = null;
    }

    isOpen() {
        return this._activeModal !== null;
    }

    getActive() {
        return this._activeModal;
    }
}

export const Modal = new ModalManager();

// Also expose globally for onclick handlers
if (typeof window !== 'undefined') {
    window.Modal = Modal;
}

export default Modal;
