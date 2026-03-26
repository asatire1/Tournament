/**
 * NotificationBell.js — Notification Bell UI Component
 *
 * Renders a bell icon button with:
 *   - Unread badge (red dot with count, hidden when 0)
 *   - Dropdown panel listing notifications (newest first)
 *   - "Mark all read" and "Clear all" actions
 *   - Real-time updates via NotificationService.subscribe()
 *
 * Usage:
 *   const bell = new NotificationBell({ uid: 'user123', container: '#header' });
 *   bell.mount();    // renders into container
 *   bell.destroy();  // cleans up Firebase listener
 *
 * Requires: Tailwind CSS, NotificationService (global or imported)
 *
 * @module components/ui/NotificationBell
 */

import { NotificationService } from '../../services/notification-service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function timeAgo(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1)  return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)   return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7)     return `${days}d ago`;
    return new Date(isoString).toLocaleDateString();
}

const TYPE_ICONS = {
    match_ready:            '🎾',
    tournament_start:       '🏆',
    result_posted:          '📊',
    tournament_complete:    '🎉',
    registration_confirmed: '✅',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class NotificationBell {
    /**
     * @param {object} options
     * @param {string}        options.uid            - Firebase Auth UID
     * @param {string|Element} options.container     - CSS selector or DOM element to mount into
     * @param {function}       [options.onNavigate]  - Called with tournamentId when user taps a notification
     */
    constructor({ uid, container, onNavigate = null }) {
        this.uid = uid;
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;
        this.onNavigate = onNavigate;
        this._notifications = [];
        this._unreadCount = 0;
        this._open = false;
        this._unsubscribe = null;
        this._el = null;
        this._boundClose = this._handleOutsideClick.bind(this);
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    /** Render the bell into the container and start listening for updates. */
    mount() {
        if (!this.container) {
            console.warn('[NotificationBell] container not found');
            return;
        }

        // Create wrapper element
        this._el = document.createElement('div');
        this._el.className = 'relative';
        this._el.setAttribute('data-notification-bell', '');
        this._el.innerHTML = this._renderBell();
        this.container.appendChild(this._el);

        this._attachEvents();

        // Start real-time listener
        this._unsubscribe = NotificationService.subscribe(
            this.uid,
            (notifications, unreadCount) => {
                this._notifications = notifications;
                this._unreadCount = unreadCount;
                this._updateBadge();
                if (this._open) this._updatePanel();
            }
        );
    }

    /** Remove the component and clean up the Firebase listener. */
    destroy() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
        document.removeEventListener('click', this._boundClose);
        if (this._el) {
            this._el.remove();
            this._el = null;
        }
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    _renderBell() {
        return `
            <button
                class="relative p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                aria-label="Notifications"
                data-action="toggle"
            >
                <!-- Bell icon (SVG) -->
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                     xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2
                             2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4
                             17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                <!-- Unread badge -->
                <span
                    class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full
                           bg-red-500 text-white text-[10px] font-bold flex items-center justify-center
                           leading-none transition-all duration-200
                           ${this._unreadCount > 0 ? '' : 'hidden'}"
                    data-badge
                    aria-label="${this._unreadCount} unread notifications"
                >${this._unreadCount > 99 ? '99+' : this._unreadCount}</span>
            </button>

            <!-- Dropdown panel (hidden by default) -->
            <div
                class="hidden absolute right-0 mt-2 w-80 max-h-[420px] overflow-y-auto
                       bg-white rounded-xl shadow-xl border border-gray-200 z-50"
                data-panel
                role="menu"
                aria-label="Notification panel"
            >
                ${this._renderPanel()}
            </div>
        `;
    }

    _renderPanel() {
        const { _notifications: notes, _unreadCount: unread } = this;

        const header = `
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 class="text-sm font-semibold text-gray-900">
                    Notifications${unread > 0 ? ` <span class="text-blue-600">(${unread})</span>` : ''}
                </h3>
                <div class="flex gap-2">
                    ${unread > 0 ? `
                        <button class="text-xs text-blue-600 hover:underline" data-action="mark-all-read">
                            Mark all read
                        </button>
                    ` : ''}
                    ${notes.length > 0 ? `
                        <button class="text-xs text-gray-400 hover:text-red-500 hover:underline" data-action="clear-all">
                            Clear all
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        if (notes.length === 0) {
            return `
                ${header}
                <div class="px-4 py-8 text-center text-gray-400 text-sm">
                    <div class="text-3xl mb-2">🔔</div>
                    No notifications yet
                </div>
            `;
        }

        const items = notes.map(n => this._renderItem(n)).join('');

        return `
            ${header}
            <ul class="divide-y divide-gray-50" role="list">
                ${items}
            </ul>
        `;
    }

    _renderItem(notification) {
        const icon = TYPE_ICONS[notification.type] ?? '🔔';
        const unreadCss = notification.read
            ? 'bg-white'
            : 'bg-blue-50 border-l-2 border-blue-400';

        return `
            <li
                class="flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${unreadCss}"
                data-action="open-notification"
                data-id="${escapeHtml(notification.id)}"
                data-tournament="${escapeHtml(notification.tournamentId ?? '')}"
                role="menuitem"
                tabindex="0"
            >
                <span class="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">${icon}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">${escapeHtml(notification.title)}</p>
                    <p class="text-xs text-gray-500 mt-0.5 line-clamp-2">${escapeHtml(notification.body)}</p>
                    <p class="text-xs text-gray-400 mt-1">${timeAgo(notification.createdAt)}</p>
                </div>
                <button
                    class="flex-shrink-0 ml-1 text-gray-300 hover:text-red-400 transition-colors self-start mt-0.5"
                    data-action="delete-notification"
                    data-id="${escapeHtml(notification.id)}"
                    aria-label="Delete notification"
                    title="Delete"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </li>
        `;
    }

    // -----------------------------------------------------------------------
    // Update helpers (partial re-render — avoids full teardown/rebuild)
    // -----------------------------------------------------------------------

    _updateBadge() {
        if (!this._el) return;
        const badge = this._el.querySelector('[data-badge]');
        if (!badge) return;

        if (this._unreadCount > 0) {
            badge.textContent = this._unreadCount > 99 ? '99+' : String(this._unreadCount);
            badge.setAttribute('aria-label', `${this._unreadCount} unread notifications`);
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    _updatePanel() {
        if (!this._el) return;
        const panel = this._el.querySelector('[data-panel]');
        if (!panel) return;
        panel.innerHTML = this._renderPanel();
        this._attachPanelEvents(panel);
    }

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    _attachEvents() {
        if (!this._el) return;

        // Toggle button
        const btn = this._el.querySelector('[data-action="toggle"]');
        btn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this._togglePanel();
        });

        // Keyboard: close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._open) this._closePanel();
        });

        // Outside click
        document.addEventListener('click', this._boundClose);

        // Panel actions (delegated from panel element)
        const panel = this._el.querySelector('[data-panel]');
        if (panel) this._attachPanelEvents(panel);
    }

    _attachPanelEvents(panel) {
        panel.addEventListener('click', async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;
            const tournamentId = target.dataset.tournament;

            e.stopPropagation();

            if (action === 'mark-all-read') {
                await this._markAllRead();
            } else if (action === 'clear-all') {
                await this._clearAll();
            } else if (action === 'open-notification') {
                await this._openNotification(id, tournamentId);
            } else if (action === 'delete-notification') {
                await this._deleteNotification(id);
            }
        });
    }

    _handleOutsideClick(e) {
        if (this._open && this._el && !this._el.contains(e.target)) {
            this._closePanel();
        }
    }

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------

    _togglePanel() {
        this._open ? this._closePanel() : this._openPanel();
    }

    _openPanel() {
        const panel = this._el?.querySelector('[data-panel]');
        if (!panel) return;
        panel.innerHTML = this._renderPanel();
        this._attachPanelEvents(panel);
        panel.classList.remove('hidden');
        this._open = true;
    }

    _closePanel() {
        const panel = this._el?.querySelector('[data-panel]');
        panel?.classList.add('hidden');
        this._open = false;
    }

    async _markAllRead() {
        await NotificationService.markAllRead(this.uid);
    }

    async _clearAll() {
        await NotificationService.deleteAll(this.uid);
        this._closePanel();
    }

    async _openNotification(id, tournamentId) {
        // Mark as read
        if (id) await NotificationService.markRead(this.uid, id);

        // Navigate if handler provided and tournamentId known
        if (tournamentId && this.onNavigate) {
            this.onNavigate(tournamentId);
            this._closePanel();
        }
    }

    async _deleteNotification(id) {
        if (id) await NotificationService.delete(this.uid, id);
    }
}

export default NotificationBell;

// Browser global
if (typeof window !== 'undefined') {
    window.NotificationBell = NotificationBell;
}
