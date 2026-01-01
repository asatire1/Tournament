# UI Components - Phase 3

Reusable UI components that eliminate duplication across tournament formats.

## Components

| Component | Description |
|-----------|-------------|
| `Modal` | Modal dialogs with confirm, alert, and prompt helpers |
| `Toast` | Toast notifications with types (success, error, warning, info) |
| `Tabs` | Tab navigation with multiple styles (pills, underline, buttons) |
| `PlayerBadge` | Color-coded player badges and team displays |
| `ScoreInput` | Score entry with fixed-points mode support |
| `StandingsTable` | Tournament standings/leaderboard table |
| `MatchCard` | Match display with teams and scores |
| `Loading` | Loading spinners and skeleton loaders |
| `Empty` | Empty states and not-found pages |

## Quick Start

```html
<!-- Load components in order -->
<script src="../src/components/ui/Modal.js"></script>
<script src="../src/components/ui/Toast.js"></script>
<script src="../src/components/ui/PlayerBadge.js"></script>
<script src="../src/components/ui/ScoreInput.js"></script>
<script src="../src/components/ui/StandingsTable.js"></script>
<script src="../src/components/ui/MatchCard.js"></script>
<script src="../src/components/ui/Loading.js"></script>
<script src="../src/components/ui/Tabs.js"></script>

<!-- Required containers in your HTML -->
<div id="modal-container"></div>
<div id="toast-container" class="fixed bottom-4 right-4 z-50"></div>
```

## Component Usage

### Modal

```javascript
// Simple alert
Modal.alert('Tournament saved!', { title: 'Success', icon: '✅' });

// Confirmation dialog
const confirmed = await Modal.confirm('Delete this tournament?', {
    title: 'Confirm Delete',
    danger: true,
    confirmText: 'Delete',
    cancelText: 'Keep'
});

if (confirmed) {
    // delete tournament
}

// Prompt for input
const name = await Modal.prompt('Enter tournament name:', {
    title: 'Create Tournament',
    placeholder: 'Saturday Padel',
    defaultValue: ''
});

// Custom modal
Modal.show({
    title: 'Share Tournament',
    icon: '📤',
    headerGradient: 'from-green-500 to-teal-500',
    content: `
        <p>Share this link with players:</p>
        <input type="text" value="${link}" readonly class="w-full mt-2 px-3 py-2 border rounded" />
    `,
    buttons: [
        { text: 'Copy', primary: true, onClick: 'copyLink()' },
        { text: 'Close', onClick: 'Modal.close()' }
    ]
});

// Close modal
Modal.close();
```

### Toast

```javascript
// Simple toast
showToast('Tournament created!');

// Typed toasts
Toast.success('Score saved!');
Toast.error('Failed to connect');
Toast.warning('Low on time');
Toast.info('New player joined');

// With options
Toast.show('Custom message', {
    type: 'success',
    duration: 5000, // 5 seconds
    dismissible: true,
    action: {
        text: 'Undo',
        onClick: () => undoAction()
    }
});

// Clear all toasts
Toast.clear();
```

### PlayerBadge

```javascript
// Simple badge (number only)
PlayerBadge.mini(0); // First player

// Full badge with name
PlayerBadge.render({
    playerIndex: 0,
    name: 'Alice',
    size: 'md', // 'xs', 'sm', 'md', 'lg'
    showNumber: true,
    showName: true
});

// Team pair
PlayerBadge.team([0, 1], ['Alice', 'Bob'], {
    size: 'sm',
    separator: '&'
});

// Standings row
PlayerBadge.standingRow(standing, position, {
    onClick: 'showPlayerDetails(standing.playerIndex)'
});

// Get player color
const colors = getPlayerColor(playerIndex);
// colors = { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', accent: 'bg-red-500' }
```

### ScoreInput

```javascript
// Editable score input
ScoreInput.render({
    id: 'match-0-0',
    team1Score: 16,
    team2Score: 14,
    fixedPoints: true,
    totalPoints: 30,
    onChange: 'handleScoreChange()',
    showLabels: true,
    team1Label: 'Alice & Bob',
    team2Label: 'Charlie & Dave'
});

// Read-only score display
ScoreInput.display(16, 14, { size: 'lg' });

// Get scores from inputs
const { team1, team2 } = ScoreInput.getScores('match-0-0');

// Validate scores
const { valid, error } = ScoreInput.validate(team1, team2, {
    required: true,
    fixedPoints: true,
    totalPoints: 30
});
```

### StandingsTable

```javascript
// Full standings table
StandingsTable.render(standings, {
    compact: false, // Use COMPACT_COLUMNS for mobile
    showHeader: true,
    maxRows: 10,
    highlightTop: 3,
    playerColors: true,
    onRowClick: 'showPlayerDetails'
});

// Compact card view
StandingsTable.card(standings, {
    title: 'Leaderboard',
    maxRows: 5,
    showViewAll: true,
    onViewAll: 'showFullStandings()'
});

// Mini standings (top 3)
StandingsTable.mini(standings);
```

### MatchCard

```javascript
// Full match card
MatchCard.render(match, {
    playerNames: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank'],
    team1Score: 16,
    team2Score: 14,
    courtName: 'Court 1',
    roundNumber: 0,
    matchIndex: 0,
    canEdit: true,
    fixedPoints: true,
    totalPoints: 30,
    onScoreChange: 'handleScoreChange(0, 0)'
});

// Compact match card
MatchCard.render(match, { compact: true, playerNames });

// Grid of matches
MatchCard.grid(matches, {
    playerNames,
    columns: 2,
    canEdit: true
});

// Get scores from match card
const { team1, team2 } = MatchCard.getScores(roundNumber, matchIndex);
```

### Tabs

```javascript
// Simple tabs
Tabs.render({
    id: 'main-tabs',
    tabs: [
        { key: 'matches', label: 'Matches', icon: '🎾' },
        { key: 'standings', label: 'Standings', icon: '📊' },
        { key: 'settings', label: 'Settings', icon: '⚙️' }
    ],
    activeTab: 'matches',
    style: 'pills', // 'pills', 'underline', 'buttons', 'cards'
    onChange: 'handleTabChange(this.dataset.tab)'
});

// Tabs with content panels
Tabs.withPanels({
    id: 'content-tabs',
    tabs: [
        { key: 'round1', label: 'Round 1', content: renderRound1() },
        { key: 'round2', label: 'Round 2', content: renderRound2() }
    ]
});

// Programmatic control
Tabs.setActive('main-tabs', 'standings');
const activeTab = Tabs.getActive('main-tabs');
```

### Loading

```javascript
// Spinner
Loading.spinner({ size: 'lg', color: 'blue', text: 'Loading...' });

// Full page loading
Loading.page({
    title: 'Loading Session',
    code: 'ABC123',
    icon: '🔄'
});

// Skeleton loaders
Loading.skeleton({ type: 'card' });
Loading.skeleton({ type: 'table', lines: 5 });
Loading.skeleton({ type: 'avatar' });
Loading.skeleton({ type: 'text', lines: 3 });

// Inline loading dots
Loading.inline();
```

### Empty States

```javascript
// Generic empty
Empty.render({
    icon: '🎾',
    title: 'No matches yet',
    message: 'Create your first tournament to get started.',
    action: {
        text: 'Create Tournament',
        onClick: 'showCreateModal()'
    }
});

// Not found
Empty.notFound({
    title: 'Tournament Not Found',
    message: "We couldn't find a tournament with this code.",
    code: 'XYZ789',
    backAction: "Router.navigate('home')"
});

// Error state
Empty.error({
    title: 'Connection Lost',
    message: 'Unable to sync with server.',
    retryAction: 'reconnect()'
});
```

## Using UI Facade

The `UI` object provides convenient shortcuts:

```javascript
// Toasts
UI.toast('Message');
UI.success('Saved!');
UI.error('Failed!');

// Modals
UI.alert('Alert message');
const ok = await UI.confirm('Are you sure?');
const name = await UI.prompt('Enter name:');
UI.closeModal();
```

## CSS Requirements

Components use Tailwind CSS classes. Add these to your page:

```html
<script src="https://cdn.tailwindcss.com"></script>

<style>
/* Animations */
@keyframes slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
@keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}
@keyframes scale-in {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
.animate-slide-up { animation: slide-up 0.2s ease-out; }
.animate-fade-in { animation: fade-in 0.2s ease-out; }
.animate-scale-in { animation: scale-in 0.2s ease-out; }
</style>
```

## File Structure

```
src/components/
└── ui/
    ├── Modal.js          # Modal dialogs
    ├── Toast.js          # Toast notifications
    ├── PlayerBadge.js    # Player color badges
    ├── ScoreInput.js     # Score entry component
    ├── StandingsTable.js # Standings/leaderboard
    ├── MatchCard.js      # Match display cards
    ├── Loading.js        # Loading & empty states
    ├── Tabs.js           # Tab navigation
    ├── index.js          # Bundle verification
    └── README.md         # This file
```

## Migration from Existing Code

Replace inline HTML with component calls:

```javascript
// Before
document.getElementById('standings').innerHTML = `
    <div class="...">
        ${standings.map((s, i) => `
            <div>...</div>
        `).join('')}
    </div>
`;

// After
document.getElementById('standings').innerHTML = 
    StandingsTable.render(standings, { maxRows: 10 });
```

```javascript
// Before
function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'bg-gray-800 text-white...';
    // ...
}

// After (just use the component)
showToast('Message'); // Still works - backwards compatible
Toast.success('Better!'); // New typed API
```
