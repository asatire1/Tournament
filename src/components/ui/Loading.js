/**
 * Loading.js - Loading State Components
 * Spinners, skeletons, and loading indicators
 * 
 * @module components/ui/Loading
 */

/**
 * Loading component
 */
const Loading = {
    /**
     * Render a spinner
     * @param {object} options
     * @returns {string} HTML string
     */
    spinner(options = {}) {
        const { size = 'md', color = 'blue', text = null, className = '' } = options;
        
        const sizeClasses = {
            sm: 'w-6 h-6 border-2',
            md: 'w-10 h-10 border-3',
            lg: 'w-16 h-16 border-4',
            xl: 'w-20 h-20 border-4'
        };
        
        const colorClasses = {
            blue: 'border-blue-100 border-t-blue-500',
            gray: 'border-gray-100 border-t-gray-500',
            white: 'border-white/30 border-t-white',
            green: 'border-green-100 border-t-green-500'
        };

        const spinnerSize = sizeClasses[size] || sizeClasses.md;
        const spinnerColor = colorClasses[color] || colorClasses.blue;

        return `
            <div class="flex flex-col items-center justify-center ${className}">
                <div class="${spinnerSize} ${spinnerColor} rounded-full animate-spin"></div>
                ${text ? `<p class="mt-3 text-gray-500 text-sm">${text}</p>` : ''}
            </div>
        `;
    },

    /**
     * Render full page loading state
     * @param {object} options
     * @returns {string} HTML string
     */
    page(options = {}) {
        const { 
            title = 'Loading...', 
            subtitle = null, 
            icon = '🔄',
            code = null 
        } = options;

        return `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <div class="relative mb-6">
                        <div class="w-20 h-20 mx-auto rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin"></div>
                        <div class="absolute inset-0 flex items-center justify-center text-3xl">${icon}</div>
                    </div>
                    <h2 class="text-xl font-semibold text-gray-800 mb-2">${title}</h2>
                    ${subtitle ? `<p class="text-gray-500">${subtitle}</p>` : ''}
                    ${code ? `<p class="text-gray-500">Code: <span class="font-mono font-bold text-blue-600">${code}</span></p>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Render skeleton loaders
     * @param {object} options
     * @returns {string} HTML string
     */
    skeleton(options = {}) {
        const { type = 'text', lines = 3, className = '' } = options;
        
        if (type === 'card') {
            return `
                <div class="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse ${className}">
                    <div class="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div class="h-3 bg-gray-100 rounded w-full mb-2"></div>
                    <div class="h-3 bg-gray-100 rounded w-5/6 mb-2"></div>
                    <div class="h-3 bg-gray-100 rounded w-4/6"></div>
                </div>
            `;
        }
        
        if (type === 'avatar') {
            return `
                <div class="flex items-center gap-3 animate-pulse ${className}">
                    <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div class="flex-1">
                        <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div class="h-3 bg-gray-100 rounded w-1/3"></div>
                    </div>
                </div>
            `;
        }
        
        if (type === 'table') {
            return `
                <div class="animate-pulse ${className}">
                    <div class="h-10 bg-gray-100 rounded-t mb-1"></div>
                    ${Array(lines).fill().map(() => `
                        <div class="h-12 bg-gray-50 rounded mb-1"></div>
                    `).join('')}
                </div>
            `;
        }

        // Default: text lines
        return `
            <div class="animate-pulse space-y-2 ${className}">
                ${Array(lines).fill().map((_, i) => `
                    <div class="h-4 bg-gray-200 rounded" style="width: ${85 - (i * 10)}%"></div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Render inline loading indicator
     * @returns {string} HTML string
     */
    inline() {
        return `
            <span class="inline-flex items-center gap-1">
                <span class="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                <span class="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                <span class="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
            </span>
        `;
    }
};

/**
 * Empty state component
 */
const Empty = {
    /**
     * Render empty state
     * @param {object} options
     * @returns {string} HTML string
     */
    render(options = {}) {
        const {
            icon = '📭',
            title = 'Nothing here yet',
            message = null,
            action = null,
            className = ''
        } = options;

        let actionHTML = '';
        if (action) {
            actionHTML = `
                <button onclick="${action.onClick || ''}" 
                        class="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">
                    ${action.text}
                </button>
            `;
        }

        return `
            <div class="text-center py-12 ${className}">
                <div class="text-6xl mb-4">${icon}</div>
                <h3 class="text-xl font-semibold text-gray-800 mb-2">${title}</h3>
                ${message ? `<p class="text-gray-500 max-w-md mx-auto">${message}</p>` : ''}
                ${actionHTML}
            </div>
        `;
    },

    /**
     * Render not found state
     * @param {object} options
     * @returns {string} HTML string
     */
    notFound(options = {}) {
        const { 
            title = 'Not Found',
            message = "We couldn't find what you're looking for.",
            code = null,
            backAction = "window.history.back()"
        } = options;

        return `
            <div class="min-h-screen flex items-center justify-center p-4">
                <div class="text-center max-w-md">
                    <div class="text-6xl mb-6">🔍</div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-3">${title}</h2>
                    <p class="text-gray-500 mb-2">${message}</p>
                    ${code ? `<p class="font-mono text-xl font-bold text-red-500 mb-6">${code}</p>` : ''}
                    <button onclick="${backAction}" 
                            class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">
                        ← Go Back
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Render error state
     * @param {object} options
     * @returns {string} HTML string
     */
    error(options = {}) {
        const {
            title = 'Something went wrong',
            message = 'An error occurred. Please try again.',
            retryAction = null,
            className = ''
        } = options;

        return `
            <div class="text-center py-12 ${className}">
                <div class="text-6xl mb-4">😕</div>
                <h3 class="text-xl font-semibold text-gray-800 mb-2">${title}</h3>
                <p class="text-gray-500 mb-4">${message}</p>
                ${retryAction ? `
                    <button onclick="${retryAction}" 
                            class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">
                        Try Again
                    </button>
                ` : ''}
            </div>
        `;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Loading, Empty };
}

if (typeof window !== 'undefined') {
    window.Loading = Loading;
    window.Empty = Empty;
}
