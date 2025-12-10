# UberPadel React Native Migration Plan
## iOS + Android from Single Codebase

---

## Overview

**Goal:** Convert UberPadel web app to native mobile apps for iOS and Android

**Approach:** React Native with Expo (managed workflow for easier development)

**Timeline:** 6-8 weeks to MVP, 10-12 weeks to polished release

**What We're Building:**
- 4 tournament formats: Americano, Mexicano, Mix, Team League
- Quick Play mode (instant tournaments)
- Competitions mode (scheduled events)
- Real-time Firebase sync
- User authentication (Google Sign-In + Guest)

---

## Phase Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: Project Setup & Foundation          │ Week 1          │
├─────────────────────────────────────────────────────────────────┤
│ Phase 2: Core Engines Migration              │ Week 1-2        │
├─────────────────────────────────────────────────────────────────┤
│ Phase 3: Firebase & Authentication           │ Week 2-3        │
├─────────────────────────────────────────────────────────────────┤
│ Phase 4: UI Components                       │ Week 3-4        │
├─────────────────────────────────────────────────────────────────┤
│ Phase 5: Screens & Navigation                │ Week 4-5        │
├─────────────────────────────────────────────────────────────────┤
│ Phase 6: Tournament Formats                  │ Week 5-7        │
├─────────────────────────────────────────────────────────────────┤
│ Phase 7: Testing & Polish                    │ Week 7-8        │
├─────────────────────────────────────────────────────────────────┤
│ Phase 8: App Store Submission                │ Week 8-9        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Project Setup & Foundation
**Duration:** 3-5 days

### 1.1 Create Expo Project
```bash
# Install Expo CLI globally
npm install -g expo-cli

# Create new project with TypeScript
npx create-expo-app UberPadel --template expo-template-blank-typescript

cd UberPadel
```

### 1.2 Project Structure
```
UberPadel/
├── app/                      # Expo Router (file-based routing)
│   ├── (tabs)/               # Tab navigation
│   │   ├── index.tsx         # Home tab
│   │   ├── quick-play.tsx    # Quick Play tab
│   │   ├── competitions.tsx  # Competitions tab
│   │   └── profile.tsx       # Profile tab
│   ├── tournament/           # Tournament screens
│   │   ├── [format]/         # Dynamic route for format
│   │   │   └── [id].tsx      # Tournament view
│   │   └── create.tsx        # Create tournament
│   ├── _layout.tsx           # Root layout
│   └── +not-found.tsx        # 404 screen
├── src/
│   ├── engines/              # Tournament logic (from web)
│   │   ├── BaseEngine.ts
│   │   ├── AmericanoEngine.ts
│   │   ├── MexicanoEngine.ts
│   │   ├── MixEngine.ts
│   │   └── TeamLeagueEngine.ts
│   ├── services/             # API & data services
│   │   ├── firebase.ts
│   │   ├── auth.ts
│   │   └── tournament.ts
│   ├── components/           # Reusable UI components
│   │   ├── ui/               # Base components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Badge.tsx
│   │   ├── tournament/       # Tournament-specific
│   │   │   ├── MatchCard.tsx
│   │   │   ├── StandingsTable.tsx
│   │   │   ├── PlayerBadge.tsx
│   │   │   ├── ScoreInput.tsx
│   │   │   └── CourtView.tsx
│   │   └── shared/           # Shared components
│   │       ├── Header.tsx
│   │       └── Loading.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── useTournament.ts
│   │   ├── useAuth.ts
│   │   └── useFirebase.ts
│   ├── store/                # State management (Zustand)
│   │   ├── tournamentStore.ts
│   │   └── authStore.ts
│   ├── types/                # TypeScript types
│   │   ├── tournament.ts
│   │   ├── player.ts
│   │   └── match.ts
│   ├── utils/                # Utility functions
│   │   ├── helpers.ts
│   │   └── constants.ts
│   └── theme/                # Styling
│       ├── colors.ts
│       ├── spacing.ts
│       └── typography.ts
├── assets/                   # Images, fonts
│   ├── images/
│   │   ├── logo.png
│   │   ├── icon.png
│   │   └── splash.png
│   └── fonts/
├── app.json                  # Expo config
├── package.json
└── tsconfig.json
```

### 1.3 Install Core Dependencies
```bash
# Navigation
npx expo install expo-router expo-linking expo-constants expo-status-bar

# Firebase
npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/database

# UI & Styling
npx expo install nativewind tailwindcss
npx expo install react-native-reanimated react-native-gesture-handler

# State Management
npm install zustand

# Utilities
npm install date-fns lodash
npm install -D @types/lodash

# Icons
npx expo install @expo/vector-icons

# Safe Area
npx expo install react-native-safe-area-context
```

### 1.4 Configure NativeWind (Tailwind for React Native)
```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',    // UberPadel blue
        secondary: '#F97316',  // Orange accent
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
    },
  },
  plugins: [],
};
```

### 1.5 Deliverables
- [ ] Expo project created and running
- [ ] Folder structure established
- [ ] All dependencies installed
- [ ] NativeWind configured
- [ ] Basic app shell with tab navigation
- [ ] App icon and splash screen configured

---

## Phase 2: Core Engines Migration
**Duration:** 4-5 days

### 2.1 TypeScript Interfaces
```typescript
// src/types/tournament.ts
export interface Player {
  id: string;
  name: string;
  index: number;
}

export interface Team {
  players: [number, number];  // Player indices
}

export interface Match {
  id: string;
  teams: [Team, Team];
  court: number;
  round: number;
  fixtureIndex: number;
}

export interface Score {
  team1: number | null;
  team2: number | null;
}

export interface Standing {
  playerIndex: number;
  name: string;
  score: number;
  avgScore: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
}

export interface TournamentConfig {
  format: 'americano' | 'mexicano' | 'mix' | 'team-league';
  playerCount: number;
  courtCount: number;
  fixedPoints: boolean;
  totalPoints: number;
}

export interface Tournament {
  id: string;
  name: string;
  format: TournamentConfig['format'];
  config: TournamentConfig;
  players: Player[];
  fixtures: Match[];
  scores: Record<string, Score>;
  standings: Standing[];
  status: 'setup' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
  organiserKey?: string;
}
```

### 2.2 Migrate BaseEngine
```typescript
// src/engines/BaseEngine.ts
import { Match, Score, Standing, Player } from '../types/tournament';

export class BaseEngine {
  /**
   * Calculate standings from matches and scores
   */
  static calculateStandings(
    players: Player[],
    matches: Match[],
    scores: Record<string, Score>
  ): Standing[] {
    const playerCount = players.length;
    
    // Initialize stats
    const playerStats = new Map<number, {
      totalScore: number;
      gamesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
      pointsFor: number;
      pointsAgainst: number;
    }>();
    
    players.forEach((_, index) => {
      playerStats.set(index, {
        totalScore: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      });
    });
    
    // Process each match
    matches.forEach((match) => {
      const scoreKey = `f_${match.fixtureIndex}`;
      const score = scores[scoreKey];
      
      if (!score || score.team1 === null || score.team2 === null) {
        return;
      }
      
      const team1Players = match.teams[0].players;
      const team2Players = match.teams[1].players;
      
      // Update team 1 players
      team1Players.forEach(playerIdx => {
        const stats = playerStats.get(playerIdx);
        if (stats) {
          stats.totalScore += score.team1!;
          stats.gamesPlayed++;
          stats.pointsFor += score.team1!;
          stats.pointsAgainst += score.team2!;
          
          if (score.team1! > score.team2!) stats.wins++;
          else if (score.team1! < score.team2!) stats.losses++;
          else stats.draws++;
        }
      });
      
      // Update team 2 players
      team2Players.forEach(playerIdx => {
        const stats = playerStats.get(playerIdx);
        if (stats) {
          stats.totalScore += score.team2!;
          stats.gamesPlayed++;
          stats.pointsFor += score.team2!;
          stats.pointsAgainst += score.team1!;
          
          if (score.team2! > score.team1!) stats.wins++;
          else if (score.team2! < score.team1!) stats.losses++;
          else stats.draws++;
        }
      });
    });
    
    // Build standings array
    return players.map((player, index) => {
      const stats = playerStats.get(index)!;
      const avgScore = stats.gamesPlayed > 0 
        ? stats.totalScore / stats.gamesPlayed 
        : 0;
      
      return {
        playerIndex: index,
        name: player.name,
        score: stats.totalScore,
        avgScore,
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        pointsFor: stats.pointsFor,
        pointsAgainst: stats.pointsAgainst,
        pointsDiff: stats.pointsFor - stats.pointsAgainst,
      };
    });
  }
  
  /**
   * Sort standings by average score
   */
  static sortStandings(standings: Standing[]): Standing[] {
    return [...standings].sort((a, b) => {
      // Primary: Average score
      if (Math.abs(b.avgScore - a.avgScore) > 0.01) {
        return b.avgScore - a.avgScore;
      }
      // Secondary: Point difference
      if (b.pointsDiff !== a.pointsDiff) {
        return b.pointsDiff - a.pointsDiff;
      }
      // Tertiary: Total score
      return b.score - a.score;
    });
  }
  
  /**
   * Generate tournament ID
   */
  static generateId(length = 6): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < length; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }
  
  /**
   * Generate organiser key
   */
  static generateOrganiserKey(length = 16): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < length; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }
  
  /**
   * Validate score
   */
  static validateScore(value: any, max?: number): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const numValue = parseInt(String(value), 10);
    
    if (isNaN(numValue) || numValue < 0) {
      return null;
    }
    
    if (max !== undefined && numValue > max) {
      return max;
    }
    
    return numValue;
  }
  
  /**
   * Calculate complement score for fixed-points mode
   */
  static calculateComplementScore(score: number, totalPoints: number): number {
    return Math.max(0, totalPoints - score);
  }
}
```

### 2.3 Migrate AmericanoEngine
```typescript
// src/engines/AmericanoEngine.ts
import { BaseEngine } from './BaseEngine';
import { Match, Player, Score, Standing, Team } from '../types/tournament';
import { AMERICANO_FIXTURES } from '../data/americanoFixtures';

export class AmericanoEngine extends BaseEngine {
  static CONFIG = {
    MIN_PLAYERS: 5,
    MAX_PLAYERS: 24,
    MIN_COURTS: 1,
    MAX_COURTS: 6,
    DEFAULT_TOTAL_POINTS: 16,
    POINTS_OPTIONS: [16, 21, 24, 32],
  };
  
  /**
   * Get fixtures for player count
   */
  static getFixtures(playerCount: number): Match[] {
    const fixtureData = AMERICANO_FIXTURES[playerCount];
    if (!fixtureData) {
      throw new Error(`No fixtures available for ${playerCount} players`);
    }
    
    return fixtureData.map((fixture, index) => ({
      id: `f_${index}`,
      teams: [
        { players: [fixture.teams[0][0] - 1, fixture.teams[0][1] - 1] },
        { players: [fixture.teams[1][0] - 1, fixture.teams[1][1] - 1] },
      ] as [Team, Team],
      court: 0,
      round: Math.floor(index / Math.floor(playerCount / 4)),
      fixtureIndex: index,
    }));
  }
  
  /**
   * Group fixtures into timeslots (multi-court)
   */
  static groupIntoTimeslots(
    fixtures: Match[], 
    courtCount: number,
    playerCount: number
  ): { matches: Match[]; resting: number[] }[] {
    const timeslots: { matches: Match[]; resting: number[] }[] = [];
    const usedIndices = new Set<number>();
    
    while (usedIndices.size < fixtures.length) {
      const timeslot: { matches: Match[]; resting: number[] } = {
        matches: [],
        resting: Array.from({ length: playerCount }, (_, i) => i),
      };
      
      const playersInTimeslot = new Set<number>();
      
      for (let i = 0; i < fixtures.length && timeslot.matches.length < courtCount; i++) {
        if (usedIndices.has(i)) continue;
        
        const fixture = fixtures[i];
        const allPlayers = [
          ...fixture.teams[0].players,
          ...fixture.teams[1].players,
        ];
        
        const hasConflict = allPlayers.some(p => playersInTimeslot.has(p));
        
        if (!hasConflict) {
          timeslot.matches.push({ ...fixture, court: timeslot.matches.length });
          usedIndices.add(i);
          
          allPlayers.forEach(p => {
            playersInTimeslot.add(p);
            const restIdx = timeslot.resting.indexOf(p);
            if (restIdx > -1) timeslot.resting.splice(restIdx, 1);
          });
        }
      }
      
      timeslots.push(timeslot);
    }
    
    return timeslots;
  }
  
  /**
   * Calculate Americano standings
   */
  static calculateStandings(
    players: Player[],
    fixtures: Match[],
    scores: Record<string, Score>
  ): Standing[] {
    const standings = BaseEngine.calculateStandings(players, fixtures, scores);
    return BaseEngine.sortStandings(standings);
  }
}
```

### 2.4 Migrate Other Engines
- MexicanoEngine.ts (dynamic matchups based on standings)
- MixEngine.ts (20-28 players with rest rotation)
- TeamLeagueEngine.ts (fixed teams)

### 2.5 Create Fixture Data Files
```typescript
// src/data/americanoFixtures.ts
export const AMERICANO_FIXTURES: Record<number, Array<{
  teams: [[number, number], [number, number]];
  rest: number[];
}>> = {
  5: [
    { teams: [[1, 2], [3, 4]], rest: [5] },
    { teams: [[1, 3], [2, 5]], rest: [4] },
    // ... all fixtures for 5 players
  ],
  6: [
    { teams: [[1, 2], [3, 4]], rest: [5, 6] },
    // ... all fixtures for 6 players
  ],
  // ... up to 24 players
};
```

### 2.6 Deliverables
- [ ] All TypeScript types defined
- [ ] BaseEngine migrated with full type safety
- [ ] AmericanoEngine migrated
- [ ] MexicanoEngine migrated
- [ ] MixEngine migrated
- [ ] TeamLeagueEngine migrated
- [ ] All fixture data files created
- [ ] Unit tests for engines

---

## Phase 3: Firebase & Authentication
**Duration:** 4-5 days

### 3.1 Firebase Configuration
```typescript
// src/services/firebase.ts
import { initializeApp, getApps, getApp } from '@react-native-firebase/app';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDYIlRS_me7sy7ptNmRrvPQCeXP2H-hHzU",
  authDomain: "stretford-padel-tournament.firebaseapp.com",
  databaseURL: "https://stretford-padel-tournament-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "stretford-padel-tournament",
  storageBucket: "stretford-padel-tournament.firebasestorage.app",
  messagingSenderId: "596263602058",
  appId: "1:596263602058:web:f69f7f8d00c60abbd0aa73"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = database();
export const firebaseAuth = auth();

export default app;
```

### 3.2 Tournament Service
```typescript
// src/services/tournamentService.ts
import { db } from './firebase';
import { Tournament, Score, TournamentConfig } from '../types/tournament';
import { BaseEngine } from '../engines/BaseEngine';

const FIREBASE_ROOTS = {
  americano: 'americano-tournaments',
  mexicano: 'mexicano-tournaments',
  mix: 'mix-tournaments',
  'team-league': 'team-league-tournaments',
};

export class TournamentService {
  /**
   * Create a new tournament
   */
  static async create(
    format: TournamentConfig['format'],
    data: Partial<Tournament>
  ): Promise<{ id: string; organiserKey: string }> {
    const id = BaseEngine.generateId();
    const organiserKey = BaseEngine.generateOrganiserKey();
    const root = FIREBASE_ROOTS[format];
    
    const tournament: Partial<Tournament> = {
      ...data,
      id,
      format,
      status: 'setup',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await db.ref(`${root}/${id}`).set({
      ...tournament,
      meta: {
        name: data.name,
        organiserKey,
        createdAt: tournament.createdAt,
      },
    });
    
    return { id, organiserKey };
  }
  
  /**
   * Check if tournament exists
   */
  static async exists(
    format: TournamentConfig['format'],
    id: string
  ): Promise<boolean> {
    const root = FIREBASE_ROOTS[format];
    const snapshot = await db.ref(`${root}/${id}/meta`).once('value');
    return snapshot.exists();
  }
  
  /**
   * Get tournament data
   */
  static async get(
    format: TournamentConfig['format'],
    id: string
  ): Promise<Tournament | null> {
    const root = FIREBASE_ROOTS[format];
    const snapshot = await db.ref(`${root}/${id}`).once('value');
    return snapshot.val();
  }
  
  /**
   * Subscribe to tournament updates
   */
  static subscribe(
    format: TournamentConfig['format'],
    id: string,
    callback: (data: Tournament | null) => void
  ): () => void {
    const root = FIREBASE_ROOTS[format];
    const ref = db.ref(`${root}/${id}`);
    
    const handler = (snapshot: any) => {
      callback(snapshot.val());
    };
    
    ref.on('value', handler);
    
    return () => ref.off('value', handler);
  }
  
  /**
   * Subscribe to scores only (optimized)
   */
  static subscribeScores(
    format: TournamentConfig['format'],
    id: string,
    callback: (scores: Record<string, Score>) => void
  ): () => void {
    const root = FIREBASE_ROOTS[format];
    const ref = db.ref(`${root}/${id}/scores`);
    
    const handler = (snapshot: any) => {
      callback(snapshot.val() || {});
    };
    
    ref.on('value', handler);
    
    return () => ref.off('value', handler);
  }
  
  /**
   * Update score
   */
  static async updateScore(
    format: TournamentConfig['format'],
    id: string,
    fixtureIndex: number,
    score: Score
  ): Promise<void> {
    const root = FIREBASE_ROOTS[format];
    await db.ref(`${root}/${id}/scores/f_${fixtureIndex}`).set({
      team1: score.team1 ?? -1,
      team2: score.team2 ?? -1,
    });
    await db.ref(`${root}/${id}/meta/updatedAt`).set(new Date().toISOString());
  }
  
  /**
   * Verify organiser key
   */
  static async verifyOrganiserKey(
    format: TournamentConfig['format'],
    id: string,
    key: string
  ): Promise<boolean> {
    const root = FIREBASE_ROOTS[format];
    const snapshot = await db.ref(`${root}/${id}/meta/organiserKey`).once('value');
    return snapshot.val() === key;
  }
  
  /**
   * Update tournament config
   */
  static async updateConfig(
    format: TournamentConfig['format'],
    id: string,
    updates: Partial<Tournament>
  ): Promise<void> {
    const root = FIREBASE_ROOTS[format];
    await db.ref(`${root}/${id}`).update({
      ...updates,
      'meta/updatedAt': new Date().toISOString(),
    });
  }
}
```

### 3.3 Authentication Service
```typescript
// src/services/authService.ts
import { firebaseAuth, db } from './firebase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export interface User {
  id: string;
  name: string;
  email: string | null;
  type: 'guest' | 'registered';
  status: 'pending' | 'verified';
  photoURL?: string;
  playtomicUsername?: string;
  playtomicLevel?: number;
}

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID', // From Firebase Console
});

export class AuthService {
  /**
   * Sign in with Google
   */
  static async signInWithGoogle(): Promise<User> {
    // Get Google credential
    await GoogleSignin.hasPlayServices();
    const { idToken } = await GoogleSignin.signIn();
    
    // Sign in to Firebase
    const credential = firebaseAuth.GoogleAuthProvider.credential(idToken);
    const result = await firebaseAuth.signInWithCredential(credential);
    
    // Sync with database
    return this.syncUser(result.user);
  }
  
  /**
   * Continue as guest
   */
  static async continueAsGuest(name: string): Promise<User> {
    const id = this.generateGuestId();
    
    const user: User = {
      id,
      name,
      email: null,
      type: 'guest',
      status: 'pending',
    };
    
    return user;
  }
  
  /**
   * Sign out
   */
  static async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
    } catch {}
    await firebaseAuth.signOut();
  }
  
  /**
   * Get current Firebase user
   */
  static getCurrentFirebaseUser() {
    return firebaseAuth.currentUser;
  }
  
  /**
   * Subscribe to auth state
   */
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.syncUser(firebaseUser);
        callback(user);
      } else {
        callback(null);
      }
    });
  }
  
  /**
   * Sync Firebase user with database
   */
  private static async syncUser(firebaseUser: any): Promise<User> {
    const userId = firebaseUser.uid;
    const userRef = db.ref(`users/${userId}`);
    
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();
    
    if (userData) {
      return {
        id: userId,
        name: userData.name || firebaseUser.displayName || 'User',
        email: firebaseUser.email,
        type: 'registered',
        status: userData.status || 'pending',
        photoURL: firebaseUser.photoURL,
        playtomicUsername: userData.playtomicUsername,
        playtomicLevel: userData.playtomicLevel,
      };
    } else {
      // New user
      const newUser: User = {
        id: userId,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email,
        type: 'registered',
        status: 'pending',
        photoURL: firebaseUser.photoURL,
      };
      
      await userRef.set({
        name: newUser.name,
        email: newUser.email,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      
      return newUser;
    }
  }
  
  private static generateGuestId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = 'guest_';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }
}
```

### 3.4 Deliverables
- [ ] Firebase initialized and configured
- [ ] TournamentService with all CRUD operations
- [ ] Real-time subscription working
- [ ] AuthService with Google Sign-In
- [ ] Guest mode working
- [ ] iOS GoogleService-Info.plist configured
- [ ] Android google-services.json configured

---

## Phase 4: UI Components
**Duration:** 5-6 days

### 4.1 Base Components

```typescript
// src/components/ui/Button.tsx
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
}: ButtonProps) {
  const baseStyles = 'rounded-lg items-center justify-center flex-row';
  
  const variantStyles = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    outline: 'bg-transparent border-2 border-primary',
    danger: 'bg-error',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };
  
  const textStyles = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-primary',
    danger: 'text-white',
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#2563EB' : '#fff'} />
      ) : (
        <Text className={`font-semibold ${textStyles[variant]}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
```

```typescript
// src/components/ui/Card.tsx
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
}

export function Card({ children, variant = 'default', className, ...props }: CardProps) {
  const baseStyles = 'bg-white rounded-xl p-4';
  const variantStyles = {
    default: 'border border-gray-200',
    elevated: 'shadow-lg',
  };
  
  return (
    <View className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </View>
  );
}
```

### 4.2 Tournament Components

```typescript
// src/components/tournament/MatchCard.tsx
import { View, Text } from 'react-native';
import { Card } from '../ui/Card';
import { ScoreInput } from './ScoreInput';
import { PlayerBadge } from './PlayerBadge';
import { Match, Score, Player } from '../../types/tournament';

interface MatchCardProps {
  match: Match;
  players: Player[];
  score: Score;
  courtName: string;
  canEdit: boolean;
  fixedPoints: boolean;
  totalPoints: number;
  onScoreChange: (team: 1 | 2, value: number | null) => void;
}

export function MatchCard({
  match,
  players,
  score,
  courtName,
  canEdit,
  fixedPoints,
  totalPoints,
  onScoreChange,
}: MatchCardProps) {
  const team1Players = match.teams[0].players.map(i => players[i]);
  const team2Players = match.teams[1].players.map(i => players[i]);
  
  const getWinnerStyle = (teamNum: 1 | 2) => {
    if (score.team1 === null || score.team2 === null) return '';
    if (teamNum === 1 && score.team1 > score.team2) return 'border-l-4 border-l-green-500';
    if (teamNum === 2 && score.team2 > score.team1) return 'border-l-4 border-l-green-500';
    return '';
  };
  
  return (
    <Card className="mb-3">
      {/* Court Header */}
      <View className="bg-gray-100 -m-4 mb-3 p-2 rounded-t-xl">
        <Text className="text-center text-gray-600 font-medium">{courtName}</Text>
      </View>
      
      {/* Team 1 */}
      <View className={`flex-row items-center justify-between py-2 ${getWinnerStyle(1)}`}>
        <View className="flex-1 flex-row">
          {team1Players.map((player, i) => (
            <PlayerBadge key={player.id} name={player.name} className={i > 0 ? 'ml-2' : ''} />
          ))}
        </View>
        <ScoreInput
          value={score.team1}
          onChange={(val) => onScoreChange(1, val)}
          disabled={!canEdit}
          max={fixedPoints ? totalPoints : undefined}
        />
      </View>
      
      {/* VS Divider */}
      <View className="items-center py-1">
        <Text className="text-gray-400 text-xs">vs</Text>
      </View>
      
      {/* Team 2 */}
      <View className={`flex-row items-center justify-between py-2 ${getWinnerStyle(2)}`}>
        <View className="flex-1 flex-row">
          {team2Players.map((player, i) => (
            <PlayerBadge key={player.id} name={player.name} className={i > 0 ? 'ml-2' : ''} />
          ))}
        </View>
        <ScoreInput
          value={score.team2}
          onChange={(val) => onScoreChange(2, val)}
          disabled={!canEdit || (fixedPoints && score.team1 !== null)}
          max={fixedPoints ? totalPoints : undefined}
        />
      </View>
    </Card>
  );
}
```

```typescript
// src/components/tournament/StandingsTable.tsx
import { View, Text, ScrollView } from 'react-native';
import { Standing } from '../../types/tournament';

interface StandingsTableProps {
  standings: Standing[];
  showFullStats?: boolean;
}

export function StandingsTable({ standings, showFullStats = false }: StandingsTableProps) {
  return (
    <ScrollView horizontal={showFullStats}>
      <View className="bg-white rounded-xl overflow-hidden">
        {/* Header */}
        <View className="flex-row bg-gray-100 py-3 px-4">
          <Text className="w-8 font-bold text-gray-600">#</Text>
          <Text className="flex-1 font-bold text-gray-600">Player</Text>
          <Text className="w-16 text-right font-bold text-gray-600">Avg</Text>
          <Text className="w-16 text-right font-bold text-gray-600">Total</Text>
          {showFullStats && (
            <>
              <Text className="w-12 text-right font-bold text-gray-600">W</Text>
              <Text className="w-12 text-right font-bold text-gray-600">L</Text>
              <Text className="w-12 text-right font-bold text-gray-600">+/-</Text>
            </>
          )}
        </View>
        
        {/* Rows */}
        {standings.map((player, index) => (
          <View
            key={player.playerIndex}
            className={`flex-row py-3 px-4 border-b border-gray-100 ${
              index < 3 ? 'bg-yellow-50' : ''
            }`}
          >
            <Text className="w-8 font-bold text-gray-500">{index + 1}</Text>
            <Text className="flex-1 font-medium" numberOfLines={1}>
              {player.name}
            </Text>
            <Text className="w-16 text-right font-bold text-primary">
              {player.avgScore.toFixed(1)}
            </Text>
            <Text className="w-16 text-right text-gray-600">{player.score}</Text>
            {showFullStats && (
              <>
                <Text className="w-12 text-right text-green-600">{player.wins}</Text>
                <Text className="w-12 text-right text-red-600">{player.losses}</Text>
                <Text className="w-12 text-right text-gray-600">
                  {player.pointsDiff > 0 ? '+' : ''}{player.pointsDiff}
                </Text>
              </>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
```

### 4.3 Deliverables
- [ ] Base UI components (Button, Card, Input, Badge, Modal)
- [ ] MatchCard component
- [ ] ScoreInput component
- [ ] PlayerBadge component
- [ ] StandingsTable component
- [ ] CourtView component
- [ ] Loading/Skeleton components
- [ ] All components styled with NativeWind

---

## Phase 5: Screens & Navigation
**Duration:** 4-5 days

### 5.1 App Layout
```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/providers/AuthProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="tournament" />
          <Stack.Screen name="auth" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

### 5.2 Tab Navigation
```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quick-play"
        options={{
          title: 'Quick Play',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="competitions"
        options={{
          title: 'Competitions',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### 5.3 Key Screens

**Home Screen:**
- Logo and branding
- Quick actions (Start Tournament, Join Tournament)
- Recent tournaments
- Featured competitions

**Quick Play Screen:**
- Format selection (Americano, Mexicano, Mix, Team League)
- Create tournament form
- Join with code

**Tournament Screen:**
- Tab view: Fixtures | Standings | Settings
- Real-time score updates
- Share tournament link

**Profile Screen:**
- User info
- My tournaments
- Sign in / Sign out

### 5.4 Deliverables
- [ ] Root layout with providers
- [ ] Tab navigation configured
- [ ] Home screen
- [ ] Quick Play screen
- [ ] Competitions screen
- [ ] Profile screen
- [ ] Tournament view screen
- [ ] Create tournament flow
- [ ] Join tournament flow
- [ ] Deep linking configured

---

## Phase 6: Tournament Formats Implementation
**Duration:** 8-10 days

### 6.1 Americano Format (2 days)
- Player count selection (5-24)
- Court count selection
- Fixed/variable points
- All fixtures pre-generated
- Multi-court scheduling

### 6.2 Mexicano Format (2 days)
- Dynamic matchups based on standings
- Round-by-round generation
- Bye handling for odd players

### 6.3 Mix Tournament Format (3 days)
- 20-28 player support
- Rest rotation system
- Complex fixture data

### 6.4 Team League Format (2 days)
- Fixed team pairings
- League table
- Head-to-head results

### 6.5 Deliverables
- [ ] All 4 formats fully functional
- [ ] Format-specific create flows
- [ ] Format-specific tournament views
- [ ] Scoring working for all formats
- [ ] Standings calculated correctly

---

## Phase 7: Testing & Polish
**Duration:** 5-7 days

### 7.1 Testing Checklist
- [ ] Unit tests for engines
- [ ] Integration tests for Firebase
- [ ] E2E tests for critical flows
- [ ] Test on multiple iOS devices
- [ ] Test on multiple Android devices
- [ ] Test offline functionality
- [ ] Test real-time sync with multiple users

### 7.2 Polish Items
- [ ] Loading states
- [ ] Error handling & messages
- [ ] Empty states
- [ ] Pull to refresh
- [ ] Haptic feedback
- [ ] Animations & transitions
- [ ] Dark mode support (optional)

### 7.3 Performance
- [ ] Optimize re-renders
- [ ] Lazy load screens
- [ ] Image optimization
- [ ] Bundle size analysis

---

## Phase 8: App Store Submission
**Duration:** 5-7 days

### 8.1 iOS (App Store)
```
Required Assets:
- App Icon: 1024x1024 PNG (you have this ✓)
- Screenshots: 6.5" (1284 x 2778)
- Screenshots: 5.5" (1242 x 2208)
- iPad screenshots (optional)

Required Information:
- App name: UberPadel
- Subtitle: Padel Tournament Manager
- Description (4000 chars max)
- Keywords (100 chars)
- Support URL
- Privacy Policy URL
- Category: Sports
- Age Rating: 4+
```

### 8.2 Android (Google Play)
```
Required Assets:
- App Icon: 512x512 PNG
- Feature Graphic: 1024x500
- Screenshots: Phone (min 2)
- Screenshots: Tablet (optional)

Required Information:
- App name
- Short description (80 chars)
- Full description (4000 chars)
- Category: Sports
- Content rating questionnaire
- Privacy Policy URL
```

### 8.3 Build Commands
```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## Timeline Summary

| Phase | Description | Duration | Dependencies |
|-------|-------------|----------|--------------|
| 1 | Project Setup | 3-5 days | None |
| 2 | Core Engines | 4-5 days | Phase 1 |
| 3 | Firebase & Auth | 4-5 days | Phase 1 |
| 4 | UI Components | 5-6 days | Phase 1 |
| 5 | Screens & Nav | 4-5 days | Phase 2, 3, 4 |
| 6 | Tournament Formats | 8-10 days | Phase 5 |
| 7 | Testing & Polish | 5-7 days | Phase 6 |
| 8 | App Store Submit | 5-7 days | Phase 7 |

**Total: 8-12 weeks**

---

## Next Steps

1. **Start Phase 1** - Set up the Expo project
2. **Create shared folder** - For code shared between web and mobile
3. **Set up CI/CD** - Expo EAS for builds

Ready to begin when you are! 🚀
