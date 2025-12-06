/**
 * Tabs.js - Tabs Navigation Component
 * Reusable tab navigation with different styles
 * 
 * @module components/ui/Tabs
 */

/**
 * Tabs component
 */
const Tabs = {
    _activeTab: {},

    /**
     * Render tabs navigation
     * @param {object} options
     * @returns {string} HTML string
     */
    render(options = {}) {
        const {
            id = 'tabs',
            tabs = [],
            activeTab = null,
            style = 'pills', // 'pills', 'underline', 'buttons', 'cards'
            size = 'md', // 'sm', 'md', 'lg'
            fullWidth = false,
            onChange = null,
            className = ''
        } = options;

        if (!tabs || tabs.length === 0) {
            return '';
        }

        const active = activeTab || tabs[0].key;
        this._activeTab[id] = active;

        const styleClasses = this._getStyleClasses(style, size);
        const containerClass = fullWidth ? 'w-full' : 'inline-flex';

        const tabsHTML = tabs.map(tab => {
            const isActive = tab.key === active;
            const tabClass = isActive ? styleClasses.active : styleClasses.inactive;
            const widthClass = fullWidth ? 'flex-1' : '';
            const onClickHandler = onChange || `Tabs.setActive('${id}', '${tab.key}')`;

            return `
                <button 
                    id="${id}-tab-${tab.key}"
                    class="${styleClasses.base} ${tabClass} ${widthClass}"
                    onclick="${onClickHandler}"
                    data-tab="${tab.key}"
                    ${isActive ? 'aria-selected="true"' : 'aria-selected="false"'}>
                    ${tab.icon ? `<span class="mr-1.5">${tab.icon}</span>` : ''}
                    ${tab.label}
                    ${tab.badge ? `<span class="ml-1.5 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">${tab.badge}</span>` : ''}
                </button>
            `;
        }).join('');

        return `
            <div id="${id}" class="${containerClass} ${styleClasses.container} ${className}" role="tablist">
                ${tabsHTML}
            </div>
        `;
    },

    /**
     * Get style classes for different tab styles
     * @private
     */
    _getStyleClasses(style, size) {
        const sizeClasses = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-base',
            lg: 'px-6 py-3 text-lg'
        };
        const sizeClass = sizeClasses[size] || sizeClasses.md;

        const styles = {
            pills: {
                container: 'flex gap-1 p-1 bg-gray-100 rounded-xl',
                base: `${sizeClass} font-medium rounded-lg transition-all duration-200 flex items-center justify-center`,
                active: 'bg-white text-gray-800 shadow-sm',
                inactive: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            },
            underline: {
                container: 'flex border-b border-gray-200',
                base: `${sizeClass} font-medium border-b-2 -mb-px transition-colors flex items-center justify-center`,
                active: 'border-blue-500 text-blue-600',
                inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            },
            buttons: {
                container: 'flex gap-2',
                base: `${sizeClass} font-medium rounded-xl border-2 transition-colors flex items-center justify-center`,
                active: 'bg-blue-500 border-blue-500 text-white',
                inactive: 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
            },
            cards: {
                container: 'flex gap-3',
                base: `${sizeClass} font-medium rounded-xl border transition-all flex items-center justify-center`,
                active: 'bg-white border-blue-200 text-blue-600 shadow-md ring-2 ring-blue-100',
                inactive: 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white hover:border-gray-300'
            }
        };

        return styles[style] || styles.pills;
    },

    /**
     * Set active tab programmatically
     * @param {string} id - Tabs container ID
     * @param {string} tabKey - Tab key to activate
     */
    setActive(id, tabKey) {
        this._activeTab[id] = tabKey;
        
        // Update DOM
        const container = document.getElementById(id);
        if (!container) return;

        const tabs = container.querySelectorAll('[data-tab]');
        tabs.forEach(tab => {
            const key = tab.dataset.tab;
            const isActive = key === tabKey;
            
            // Get current style from classes
            const isPills = container.classList.contains('bg-gray-100');
            
            if (isPills) {
                if (isActive) {
                    tab.classList.remove('text-gray-500', 'hover:text-gray-700', 'hover:bg-gray-50');
                    tab.classList.add('bg-white', 'text-gray-800', 'shadow-sm');
                } else {
                    tab.classList.remove('bg-white', 'text-gray-800', 'shadow-sm');
                    tab.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:bg-gray-50');
                }
            }
            
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    },

    /**
     * Get active tab
     * @param {string} id - Tabs container ID
     * @returns {string|null} Active tab key
     */
    getActive(id) {
        return this._activeTab[id] || null;
    },

    /**
     * Render tabs with content panels
     * @param {object} options
     * @returns {string} HTML string
     */
    withPanels(options = {}) {
        const {
            id = 'tabbed-content',
            tabs = [],
            activeTab = null,
            tabsOptions = {},
            className = ''
        } = options;

        const active = activeTab || tabs[0]?.key;

        const tabsHTML = this.render({
            id: `${id}-nav`,
            tabs: tabs.map(t => ({ key: t.key, label: t.label, icon: t.icon, badge: t.badge })),
            activeTab: active,
            onChange: `Tabs._switchPanel('${id}', '${tabs.map(t => t.key).join(',')}', this.dataset.tab)`,
            ...tabsOptions
        });

        const panelsHTML = tabs.map(tab => `
            <div id="${id}-panel-${tab.key}" 
                 class="tab-panel ${tab.key === active ? '' : 'hidden'}"
                 role="tabpanel">
                ${tab.content || ''}
            </div>
        `).join('');

        return `
            <div id="${id}" class="${className}">
                ${tabsHTML}
                <div class="mt-4">
                    ${panelsHTML}
                </div>
            </div>
        `;
    },

    /**
     * Switch panel visibility
     * @private
     */
    _switchPanel(id, tabKeys, activeKey) {
        const keys = tabKeys.split(',');
        
        keys.forEach(key => {
            const panel = document.getElementById(`${id}-panel-${key}`);
            if (panel) {
                if (key === activeKey) {
                    panel.classList.remove('hidden');
                } else {
                    panel.classList.add('hidden');
                }
            }
        });

        this.setActive(`${id}-nav`, activeKey);
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Tabs };
}

if (typeof window !== 'undefined') {
    window.Tabs = Tabs;
}
