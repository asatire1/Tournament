export interface Standing {
  rank: number;
  name: string;
  points: number;
  played?: number;
  wins?: number;
  losses?: number;
  pointsDiff?: number;
}

export interface TournamentInfo {
  name: string;
  formatName: string;
  formatEmoji: string;
  accentColor: string;
  subtitle: string;
  standings: Standing[];
  totalMatches: number;
  completedMatches: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeString(val: unknown, fallback: string = 'Unnamed'): string {
  return typeof val === 'string' && val.length > 0 ? val : fallback;
}

function safeNumber(val: unknown, fallback: number = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/** Cap standings at 10 entries and assign sequential ranks. */
function rankAndCap(standings: Omit<Standing, 'rank'>[]): Standing[] {
  return standings.slice(0, 10).map((s, i) => ({ rank: i + 1, ...s }));
}

// ---------------------------------------------------------------------------
// Format-specific calculators
// ---------------------------------------------------------------------------

function calcAmericano(data: any): TournamentInfo | null {
  const name = safeString(data?.name, 'Americano Tournament');
  const playerNames: string[] = Array.isArray(data?.playerNames)
    ? data.playerNames
    : [];
  const playerCount = safeNumber(
    data?.playerCount,
    playerNames.length,
  );

  const scores = data?.scores ?? {};
  const scoreKeys = Object.keys(scores);
  const totalMatches = scoreKeys.length;
  const completedMatches = scoreKeys.filter((k) => {
    const s = scores[k];
    return (
      s &&
      (safeNumber(s.team1) > 0 || safeNumber(s.team2) > 0)
    );
  }).length;

  return {
    name,
    formatName: 'Americano',
    formatEmoji: '\uD83C\uDFBE', // tennis ball
    accentColor: 'blue',
    subtitle: `${playerCount} players \u2022 ${completedMatches}/${totalMatches} matches`,
    standings: [],
    totalMatches,
    completedMatches,
  };
}

// ---------------------------------------------------------------------------

function calcMexicanoLike(
  data: any,
  opts: {
    formatName: string;
    formatEmoji: string;
    accentColor: string;
    subtitlePrefix: string;
  },
): TournamentInfo | null {
  const name = safeString(data?.name, `${opts.formatName} Tournament`);
  const players: any[] = Array.isArray(data?.players) ? data.players : [];
  const rounds: any[] = Array.isArray(data?.rounds) ? data.rounds : [];
  const pointsPerMatch = safeNumber(data?.pointsPerMatch, 0);

  // Build a map of player id -> { name, points }
  const playerMap = new Map<
    string,
    { name: string; points: number; played: number }
  >();
  for (const p of players) {
    if (p && p.id != null) {
      playerMap.set(String(p.id), {
        name: safeString(p.name),
        points: 0,
        played: 0,
      });
    }
  }

  let totalMatches = 0;
  let completedMatches = 0;

  for (const round of rounds) {
    const matches: any[] = Array.isArray(round?.matches)
      ? round.matches
      : [];
    for (const match of matches) {
      totalMatches++;
      if (!match?.completed) continue;
      completedMatches++;

      const t1Id = String(match.team1Id ?? '');
      const t2Id = String(match.team2Id ?? '');
      const s1 = safeNumber(match.score1);
      const s2 = safeNumber(match.score2);

      const p1 = playerMap.get(t1Id);
      if (p1) {
        p1.points += s1;
        p1.played++;
      }

      const p2 = playerMap.get(t2Id);
      if (p2) {
        p2.points += s2;
        p2.played++;
      }
    }
  }

  const sorted = Array.from(playerMap.values()).sort(
    (a, b) => b.points - a.points,
  );

  const standings = rankAndCap(
    sorted.map((p) => ({
      name: p.name,
      points: p.points,
      played: p.played,
    })),
  );

  const ptsLabel = pointsPerMatch ? `${pointsPerMatch} pts` : '';
  const subtitle = [opts.subtitlePrefix, ptsLabel]
    .filter(Boolean)
    .join(' \u2022 ');

  return {
    name,
    formatName: opts.formatName,
    formatEmoji: opts.formatEmoji,
    accentColor: opts.accentColor,
    subtitle,
    standings,
    totalMatches,
    completedMatches,
  };
}

function calcMexicano(data: any): TournamentInfo | null {
  const mode = data?.mode === 'team' ? 'Team' : 'Individual';
  return calcMexicanoLike(data, {
    formatName: 'Mexicano',
    formatEmoji: '\uD83C\uDF2E', // taco
    accentColor: 'teal',
    subtitlePrefix: mode,
  });
}

function calcMixicano(data: any): TournamentInfo | null {
  return calcMexicanoLike(data, {
    formatName: 'Mixicano',
    formatEmoji: '\uD83D\uDC83', // dancer
    accentColor: 'rose',
    subtitlePrefix: 'Mixed Gender',
  });
}

// ---------------------------------------------------------------------------

function calcTournamentOrMix(
  data: any,
  isMix: boolean,
): TournamentInfo | null {
  const label = isMix ? 'Mix' : 'Tournament';
  const name = safeString(data?.name, `${label} Tournament`);
  const playerCount = safeNumber(
    data?.playerCount,
    Array.isArray(data?.players) ? data.players.length : 0,
  );

  const scores = data?.scores ?? {};
  const scoreKeys = Object.keys(scores);
  const totalMatches = scoreKeys.length;
  const completedMatches = scoreKeys.filter((k) => {
    const s = scores[k];
    return (
      s &&
      (safeNumber(s.team1) > 0 || safeNumber(s.team2) > 0)
    );
  }).length;

  return {
    name,
    formatName: label,
    formatEmoji: isMix ? '\uD83C\uDFAF' : '\uD83C\uDFC6', // dart / trophy
    accentColor: 'blue',
    subtitle: `${playerCount} players \u2022 ${completedMatches}/${totalMatches} matches`,
    standings: [],
    totalMatches,
    completedMatches,
  };
}

// ---------------------------------------------------------------------------
// Team-based formats share a common scoring pattern: Win=3, Draw=1, Loss=0
// ---------------------------------------------------------------------------

interface TeamRecord {
  name: string;
  points: number;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
}

function newTeamRecord(name: string): TeamRecord {
  return { name, points: 0, played: 0, wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0 };
}

function applyMatchResult(
  record: TeamRecord,
  scored: number,
  conceded: number,
): void {
  record.played++;
  record.goalsFor += scored;
  record.goalsAgainst += conceded;
  if (scored > conceded) {
    record.wins++;
    record.points += 3;
  } else if (scored === conceded) {
    record.draws++;
    record.points += 1;
  } else {
    record.losses++;
  }
}

function sortRecords(records: TeamRecord[]): TeamRecord[] {
  return records.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    return diffB - diffA;
  });
}

function recordsToStandings(records: TeamRecord[]): Standing[] {
  return rankAndCap(
    records.map((r) => ({
      name: r.name,
      points: r.points,
      played: r.played,
      wins: r.wins,
      losses: r.losses,
      pointsDiff: r.goalsFor - r.goalsAgainst,
    })),
  );
}

// ---------------------------------------------------------------------------

function calcKnockout(data: any): TournamentInfo | null {
  const name = safeString(
    data?.meta?.name ?? data?.name,
    'Knockout Tournament',
  );

  const teams: any[] = Array.isArray(data?.teams) ? data.teams : [];
  const groups: any[] = Array.isArray(data?.groups) ? data.groups : [];

  // Build team id -> name map
  const teamNameMap = new Map<string, string>();
  for (const t of teams) {
    if (t && t.id != null) {
      teamNameMap.set(String(t.id), safeString(t.name));
    }
  }

  const recordMap = new Map<string, TeamRecord>();
  const ensureRecord = (id: string): TeamRecord => {
    if (!recordMap.has(id)) {
      recordMap.set(id, newTeamRecord(teamNameMap.get(id) ?? id));
    }
    return recordMap.get(id)!;
  };

  let totalMatches = 0;
  let completedMatches = 0;

  for (const group of groups) {
    const matches: any[] = Array.isArray(group?.matches)
      ? group.matches
      : [];
    for (const match of matches) {
      totalMatches++;

      const t1Id = String(match?.team1Id ?? match?.homeTeamId ?? '');
      const t2Id = String(match?.team2Id ?? match?.awayTeamId ?? '');
      const s1 = safeNumber(match?.team1Score ?? match?.homeScore);
      const s2 = safeNumber(match?.team2Score ?? match?.awayScore);
      const completed =
        match?.completed === true ||
        match?.played === true ||
        (s1 > 0 || s2 > 0);

      if (!completed) continue;
      completedMatches++;

      if (t1Id) {
        applyMatchResult(ensureRecord(t1Id), s1, s2);
      }
      if (t2Id) {
        applyMatchResult(ensureRecord(t2Id), s2, s1);
      }
    }
  }

  const sorted = sortRecords(Array.from(recordMap.values()));

  return {
    name,
    formatName: 'Knockout',
    formatEmoji: '\uD83C\uDFC6', // trophy
    accentColor: 'orange',
    subtitle: `${teams.length} teams \u2022 ${completedMatches}/${totalMatches} matches`,
    standings: recordsToStandings(sorted),
    totalMatches,
    completedMatches,
  };
}

// ---------------------------------------------------------------------------

function calcTeamLeague(data: any): TournamentInfo | null {
  const name = safeString(data?.name, 'Team League');

  const teams: any[] = Array.isArray(data?.teams) ? data.teams : [];
  const teamNameMap = new Map<string, string>();
  for (const t of teams) {
    if (t && t.id != null) {
      teamNameMap.set(String(t.id), safeString(t.name));
    }
  }

  const recordMap = new Map<string, TeamRecord>();
  const ensureRecord = (id: string): TeamRecord => {
    if (!recordMap.has(id)) {
      recordMap.set(id, newTeamRecord(teamNameMap.get(id) ?? id));
    }
    return recordMap.get(id)!;
  };

  let totalMatches = 0;
  let completedMatches = 0;

  const groupMatchScores = data?.groupMatchScores ?? {};

  for (const groupKey of ['A', 'B']) {
    const fixturesKey =
      groupKey === 'A' ? 'groupAFixtures' : 'groupBFixtures';
    const fixtures: any[] = Array.isArray(data?.[fixturesKey])
      ? data[fixturesKey]
      : [];
    const scores = groupMatchScores[groupKey] ?? {};

    for (const fixture of fixtures) {
      const matches: any[] = Array.isArray(fixture?.matches)
        ? fixture.matches
        : Array.isArray(fixture)
          ? fixture
          : [fixture];

      for (const match of matches) {
        const t1Id = String(match?.team1Id ?? '');
        const t2Id = String(match?.team2Id ?? '');

        if (!t1Id || !t2Id) continue;
        totalMatches++;

        // Look up score in groupMatchScores using "id1-id2" key
        const scoreKey = `${t1Id}-${t2Id}`;
        const reverseKey = `${t2Id}-${t1Id}`;
        const scoreEntry = scores[scoreKey] ?? scores[reverseKey];

        if (!scoreEntry) continue;

        const s1 =
          scores[scoreKey]
            ? safeNumber(scoreEntry.team1Score)
            : safeNumber(scoreEntry.team2Score);
        const s2 =
          scores[scoreKey]
            ? safeNumber(scoreEntry.team2Score)
            : safeNumber(scoreEntry.team1Score);

        if (s1 === 0 && s2 === 0) continue;
        completedMatches++;

        applyMatchResult(ensureRecord(t1Id), s1, s2);
        applyMatchResult(ensureRecord(t2Id), s2, s1);
      }
    }
  }

  const sorted = sortRecords(Array.from(recordMap.values()));

  return {
    name,
    formatName: 'Team League',
    formatEmoji: '\uD83D\uDC65', // people
    accentColor: 'purple',
    subtitle: `${teams.length} teams \u2022 ${completedMatches}/${totalMatches} matches`,
    standings: recordsToStandings(sorted),
    totalMatches,
    completedMatches,
  };
}

// ---------------------------------------------------------------------------

function calcMatchScoreBased(
  data: any,
  opts: {
    formatName: string;
    formatEmoji: string;
    accentColor: string;
    fixturesKey: string;
  },
): TournamentInfo | null {
  const name = safeString(data?.name, `${opts.formatName} Tournament`);

  const teams: any[] = Array.isArray(data?.teams) ? data.teams : [];
  const teamNameMap = new Map<string, string>();
  for (const t of teams) {
    if (t && t.id != null) {
      teamNameMap.set(String(t.id), safeString(t.name));
    }
  }

  const recordMap = new Map<string, TeamRecord>();
  const ensureRecord = (id: string): TeamRecord => {
    if (!recordMap.has(id)) {
      recordMap.set(id, newTeamRecord(teamNameMap.get(id) ?? id));
    }
    return recordMap.get(id)!;
  };

  const fixtures: any[] = Array.isArray(data?.[opts.fixturesKey])
    ? data[opts.fixturesKey]
    : Array.isArray(data?.rounds)
      ? data.rounds
      : [];
  const matchScores = data?.matchScores ?? {};

  let totalMatches = 0;
  let completedMatches = 0;

  for (const fixture of fixtures) {
    const matches: any[] = Array.isArray(fixture?.matches)
      ? fixture.matches
      : [];
    for (const match of matches) {
      const t1Id = String(match?.team1Id ?? '');
      const t2Id = String(match?.team2Id ?? '');

      if (!t1Id || !t2Id) continue;
      totalMatches++;

      const scoreKey = `${t1Id}-${t2Id}`;
      const reverseKey = `${t2Id}-${t1Id}`;
      const scoreEntry = matchScores[scoreKey] ?? matchScores[reverseKey];

      if (!scoreEntry) continue;

      const s1 =
        matchScores[scoreKey]
          ? safeNumber(scoreEntry.team1Score)
          : safeNumber(scoreEntry.team2Score);
      const s2 =
        matchScores[scoreKey]
          ? safeNumber(scoreEntry.team2Score)
          : safeNumber(scoreEntry.team1Score);

      if (s1 === 0 && s2 === 0) continue;
      completedMatches++;

      applyMatchResult(ensureRecord(t1Id), s1, s2);
      applyMatchResult(ensureRecord(t2Id), s2, s1);
    }
  }

  const sorted = sortRecords(Array.from(recordMap.values()));

  return {
    name,
    formatName: opts.formatName,
    formatEmoji: opts.formatEmoji,
    accentColor: opts.accentColor,
    subtitle: `${teams.length} teams \u2022 ${completedMatches}/${totalMatches} matches`,
    standings: recordsToStandings(sorted),
    totalMatches,
    completedMatches,
  };
}

function calcRoundRobin(data: any): TournamentInfo | null {
  return calcMatchScoreBased(data, {
    formatName: 'Round Robin',
    formatEmoji: '\uD83D\uDD01', // repeat
    accentColor: 'emerald',
    fixturesKey: 'fixtures',
  });
}

function calcSwiss(data: any): TournamentInfo | null {
  const info = calcMatchScoreBased(data, {
    formatName: 'Swiss System',
    formatEmoji: '\uD83C\uDDE8\uD83C\uDDED', // CH flag
    accentColor: 'amber',
    fixturesKey: 'rounds',
  });

  if (info && data?.totalRounds) {
    const totalRounds = safeNumber(data.totalRounds);
    const completedRounds = Array.isArray(data?.rounds)
      ? data.rounds.length
      : 0;
    info.subtitle += ` \u2022 Round ${completedRounds}/${totalRounds}`;
  }

  return info;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function calculateTournamentInfo(
  format: string,
  data: any,
): TournamentInfo | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  try {
    switch (format) {
      case 'americano':
        return calcAmericano(data);
      case 'mexicano':
        return calcMexicano(data);
      case 'mixicano':
        return calcMixicano(data);
      case 'tournament':
        return calcTournamentOrMix(data, false);
      case 'mix':
        return calcTournamentOrMix(data, true);
      case 'knockout':
        return calcKnockout(data);
      case 'team-league':
        return calcTeamLeague(data);
      case 'round-robin':
        return calcRoundRobin(data);
      case 'swiss':
        return calcSwiss(data);
      default:
        return null;
    }
  } catch {
    return null;
  }
}
