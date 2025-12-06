/**
 * UI Components Entry Point (ES Module)
 * 
 * @module components/ui
 */

// Re-export all UI components
export { Modal, MODAL_DEFAULTS, MODAL_SIZES } from './Modal.esm.js';
export { Toast, showToast, TOAST_TYPES } from './Toast.esm.js';
export { Tabs } from './Tabs.esm.js';
export { PlayerBadge, PLAYER_COLORS, getPlayerColor, getPlayerColorClass } from './PlayerBadge.esm.js';
export { ScoreInput } from './ScoreInput.esm.js';
export { StandingsTable, DEFAULT_COLUMNS, COMPACT_COLUMNS } from './StandingsTable.esm.js';
export { MatchCard } from './MatchCard.esm.js';
export { Loading, Empty } from './Loading.esm.js';

// Import for facade
import { Modal } from './Modal.esm.js';
import { Toast, showToast } from './Toast.esm.js';
import { Tabs } from './Tabs.esm.js';
import { PlayerBadge } from './PlayerBadge.esm.js';
import { ScoreInput } from './ScoreInput.esm.js';
import { StandingsTable } from './StandingsTable.esm.js';
import { MatchCard } from './MatchCard.esm.js';
import { Loading, Empty } from './Loading.esm.js';

/**
 * UI Components facade
 */
export const UI = {
    Modal,
    Toast,
    Tabs,
    PlayerBadge,
    ScoreInput,
    StandingsTable,
    MatchCard,
    Loading,
    Empty,
    
    // Convenience methods
    toast: (message, type) => Toast.show(message, { type }),
    success: (message) => Toast.success(message),
    error: (message) => Toast.error(message),
    alert: (message, options) => Modal.alert(message, options),
    confirm: (message, options) => Modal.confirm(message, options),
    prompt: (message, options) => Modal.prompt(message, options),
    closeModal: () => Modal.close()
};

export default UI;
