/**
 * UberPadel — Core Type Definitions
 *
 * Central type declarations used across the platform.
 * Import with: import type { Tournament, Player, Score, ... } from '@/types'
 */

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

/** Firebase Realtime Database timestamp (ISO 8601 string) */
export type Timestamp = string;

/** Hex-encoded SHA-256 hash (64 chars) */
export type SHA256Hash = string;

/** Firebase Auth UID */
export type AuthUID = string;

/** 6–20 alphanumeric chars — tournament ID */
export type TournamentID = string;

/** 24-char alphanumeric organiser key */
export type OrganiserKey = string;

// ---------------------------------------------------------------------------
// Tournament formats
// ---------------------------------------------------------------------------

export type QuickPlayFormat =
    | 'americano'
    | 'mexicano'
    | 'mix'
    | 'mixicano'
    | 'team-league'
    | 'knockout'
    | 'round-robin'
    | 'swiss';

export type CompetitionFormat =
    | 'americano'
    | 'mexicano'
    | 'mix'
    | 'team-league';

export type TournamentStatus =
    | 'setup'
    | 'active'
    | 'paused'
    | 'completed';

export type CompetitionStatus =
    | 'draft'
    | 'registration'
    | 'active'
    | 'completed'
    | 'cancelled';

export type AccessRestriction =
    | 'anyone'
    | 'registered'
    | 'verified';

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export interface Player {
    /** Firebase user ID (null for guest players) */
    id: string | null;
    name: string;
    /** Playtomic skill level 0–10 */
    level?: number;
    /** URL to avatar image */
    avatar?: string;
}

export interface TeamPlayer {
    /** Index in the players array (1-based for engine, 0-based for array) */
    index: number;
    name: string;
}

// ---------------------------------------------------------------------------
// Matches & Rounds
// ---------------------------------------------------------------------------

export interface MatchTeam {
    /** Player indices (1-based) */
    players: number[];
}

export interface Match {
    team1: MatchTeam;
    team2: MatchTeam;
    /** Court name for display */
    court?: string;
}

export interface Round {
    matches: Match[];
    /** Indices of players sitting out this round (1-based) */
    resting?: number[];
}

export interface Score {
    team1: number | null;
    team2: number | null;
}

/** Firebase-stored score (uses -1 as sentinel for "not set") */
export interface FirebaseScore {
    team1: number;
    team2: number;
}

/** Key format for Americano scores: `f_${fixtureIndex}` */
export type AmericanoScoreKey = `f_${number}`;

/** Key format for other format scores: `${roundIndex}_${matchIndex}` */
export type GenericScoreKey = `${number}_${number}`;

// ---------------------------------------------------------------------------
// Tournaments
// ---------------------------------------------------------------------------

export interface TournamentMeta {
    name: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    status: TournamentStatus;
    /** Firebase Auth UID of the organiser — used for security rule ownership checks */
    organizerUid: AuthUID | null;
    /** Hashed passcode for organiser authentication (SHA-256 hex) */
    passcodeHash: SHA256Hash | null;
    /** Session-bound key for organiser write operations */
    organiserKey: OrganiserKey | null;
    /** Access restriction mode */
    mode: AccessRestriction;
}

export interface Tournament {
    id: TournamentID;
    format: QuickPlayFormat;
    meta: TournamentMeta;
    players: Player[];
    courts: string[];
    rounds: Round[];
    scores: Record<string, FirebaseScore>;
    currentRound: number;
}

// ---------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------

export interface PlayerStanding {
    playerNum: number;
    name: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    totalScore: number;
    avgScore: number;
    pointsFor: number;
    pointsAgainst: number;
    pointsDiff: number;
    avgPointsDiff: number;
    winRate: number;
}

// ---------------------------------------------------------------------------
// Competitions (scheduled events)
// ---------------------------------------------------------------------------

export interface CompetitionMeta {
    name: string;
    format: CompetitionFormat;
    status: CompetitionStatus;
    organizerId: AuthUID;
    eventDate?: Timestamp;
    venue?: string;
    description?: string;
    accessRestriction: AccessRestriction;
    minLevel?: number;
    maxLevel?: number;
    minPlayers: number;
    maxPlayers: number;
    /** Registration fee in pence/cents (0 = free) */
    fee?: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface RegisteredPlayer {
    id: string;
    name: string;
    level?: number;
    registeredAt: Timestamp;
    paymentStatus?: 'pending' | 'paid' | 'refunded';
}

export interface Competition {
    id: string;
    meta: CompetitionMeta;
    registeredPlayers: Record<string, RegisteredPlayer>;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserType = 'guest' | 'registered';
export type UserStatus = 'pending' | 'verified';
export type AuthProvider = 'google' | 'email' | 'anonymous';

export interface UserProfile {
    uid: AuthUID;
    name: string;
    type: UserType;
    status: UserStatus;
    authProvider: AuthProvider;
    email?: string;
    phone?: string;
    playtomicUsername?: string;
    playtomicLevel?: number;
    isOrganizer?: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// ELO / Rating (Phase 3)
// ---------------------------------------------------------------------------

export interface PlayerRating {
    uid: AuthUID;
    /** Current Elo rating (default 1000) */
    rating: number;
    /** Number of rated matches played */
    gamesPlayed: number;
    /** Confidence factor: reduces K-factor as more games are played */
    confidence: number;
    /** Last match date — used for inactivity decay */
    lastPlayedAt: Timestamp;
    updatedAt: Timestamp;
}

export interface RatingChange {
    matchId: string;
    tournamentId: string;
    before: number;
    after: number;
    delta: number;
    timestamp: Timestamp;
}

// ---------------------------------------------------------------------------
// Notifications (Phase 3)
// ---------------------------------------------------------------------------

export type NotificationType =
    | 'match_ready'
    | 'tournament_start'
    | 'result_posted'
    | 'tournament_complete'
    | 'registration_confirmed';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    tournamentId?: TournamentID;
    read: boolean;
    createdAt: Timestamp;
}
