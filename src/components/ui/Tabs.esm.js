/**
 * Tabs.esm.js - Tabs Component (ES Module)
 */

class TabsManager {
    constructor() { this._activeTab = {}; }
    
    render(options = {}) {
        const { id = 'tabs', tabs = [], activeTab = null, style = 'pills', onChange = null, className = '' } = options;
        if (!tabs.length) return '';
        
        const active = activeTab || tabs[0].key;
        this._activeTab[id] = active;
        
        return `<div id="${id}" class="flex gap-1 p-1 bg-gray-100 rounded-xl ${className}">
            ${tabs.map(tab => `
                <button data-tab="${tab.key}" onclick="${onChange || `Tabs.setActive('${id}', '${tab.key}')`}"
                    class="px-4 py-2 font-medium rounded-lg transition-all ${tab.key === active ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">
                    ${tab.icon ? tab.icon + ' ' : ''}${tab.label}
                </button>
            `).join('')}
        </div>`;
    }
    
    setActive(id, tabKey) { this._activeTab[id] = tabKey; }
    getActive(id) { return this._activeTab[id] || null; }
}

export const Tabs = new TabsManager();
if (typeof window !== 'undefined') window.Tabs = Tabs;
export default Tabs;
