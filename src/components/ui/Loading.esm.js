/**
 * Loading.esm.js - Loading & Empty States (ES Module)
 */

export const Loading = {
    spinner(options = {}) {
        const { size = 'md', text = null } = options;
        const sizes = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-16 h-16' };
        return `<div class="flex flex-col items-center justify-center">
            <div class="${sizes[size] || sizes.md} border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
            ${text ? `<p class="mt-3 text-gray-500 text-sm">${text}</p>` : ''}
        </div>`;
    },
    page(options = {}) {
        const { title = 'Loading...', icon = '🔄', code = null } = options;
        return `<div class="min-h-screen flex items-center justify-center">
            <div class="text-center">
                <div class="relative mb-6">
                    <div class="w-20 h-20 mx-auto rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin"></div>
                    <div class="absolute inset-0 flex items-center justify-center text-3xl">${icon}</div>
                </div>
                <h2 class="text-xl font-semibold text-gray-800 mb-2">${title}</h2>
                ${code ? `<p class="text-gray-500">Code: <span class="font-mono font-bold text-blue-600">${code}</span></p>` : ''}
            </div>
        </div>`;
    },
    skeleton(options = {}) {
        const { type = 'text', lines = 3 } = options;
        if (type === 'card') return '<div class="bg-white rounded-2xl p-4 animate-pulse"><div class="h-4 bg-gray-200 rounded w-3/4 mb-4"></div><div class="h-3 bg-gray-100 rounded w-full mb-2"></div></div>';
        return `<div class="animate-pulse space-y-2">${Array(lines).fill().map((_, i) => `<div class="h-4 bg-gray-200 rounded" style="width: ${85 - i * 10}%"></div>`).join('')}</div>`;
    }
};

export const Empty = {
    render(options = {}) {
        const { icon = '📭', title = 'Nothing here yet', message = null, action = null } = options;
        return `<div class="text-center py-12">
            <div class="text-6xl mb-4">${icon}</div>
            <h3 class="text-xl font-semibold text-gray-800 mb-2">${title}</h3>
            ${message ? `<p class="text-gray-500">${message}</p>` : ''}
            ${action ? `<button onclick="${action.onClick}" class="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold">${action.text}</button>` : ''}
        </div>`;
    },
    notFound(options = {}) {
        const { title = 'Not Found', code = null } = options;
        return `<div class="min-h-screen flex items-center justify-center p-4">
            <div class="text-center max-w-md">
                <div class="text-6xl mb-6">🔍</div>
                <h2 class="text-2xl font-bold text-gray-800 mb-3">${title}</h2>
                ${code ? `<p class="font-mono text-xl font-bold text-red-500 mb-6">${code}</p>` : ''}
                <button onclick="window.history.back()" class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold">← Go Back</button>
            </div>
        </div>`;
    },
    error(options = {}) {
        const { title = 'Something went wrong', message = 'Please try again.' } = options;
        return `<div class="text-center py-12"><div class="text-6xl mb-4">😕</div><h3 class="text-xl font-semibold text-gray-800 mb-2">${title}</h3><p class="text-gray-500">${message}</p></div>`;
    }
};

if (typeof window !== 'undefined') { window.Loading = Loading; window.Empty = Empty; }
export default { Loading, Empty };
