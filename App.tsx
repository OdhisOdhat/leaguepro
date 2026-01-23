
import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@libsql/client';
import { Team, Match, Player, Standing, UserRole, GoalScorer, CardEvent, LeagueSettings } from './types.ts';
import { INITIAL_TEAMS, INITIAL_MATCHES, DEFAULT_LEAGUE_SETTINGS } from './constants.tsx';
import Dashboard from './components/Dashboard.tsx';
import TeamRegistration from './components/TeamRegistration.tsx';
import StandingsTable from './components/StandingsTable.tsx';
import MatchScheduler from './components/MatchScheduler.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import PlayerManager from './components/PlayerManager.tsx';
import Navbar from './components/Navbar.tsx';
import Login from './components/Login.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Turso Cloud Configuration - Using HTTPS for browser compatibility
const TURSO_CONFIG = {
  url: "https://odhisodhat-vercel-icfg-ftcymaxmqxj9bs7ney2w5mpx.aws-us-east-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjkwODMyMjEsImlkIjoiNzA2MmVkNjItNDUwOS00YmEzLWIwYWYtNjBjY2YzNDJlMTg4IiwicmlkIjoiMDQ4ZmNlMDctMGEwOS00OGIxLTg3OWQtNTEzZGZiMWUxZmUzIn0.0i537WhP95mSF1AUrhIiakcMQebMcDFk21Q2C0d4b-YZpgJB4Plba8ox3wDDLtoFhJrsKDtr7r_E-dQ_aIDiBw"
};

const STORAGE_KEYS = {
  TEAMS: 'lp_teams_v2',
  MATCHES: 'lp_matches_v2',
  SETTINGS: 'lp_settings_v2',
  USERS: 'lp_local_users_v2',
  ROLE: 'lp_role_v2',
  SELECTED_TEAM: 'lp_selectedTeam_v2',
  SESSION: 'lp_session_v2'
};

// Initialize direct database client
const db = createClient(TURSO_CONFIG);

const App: React.FC = () => {
  const [view, setView] = useState<string>('dashboard');
  const [role, setRole] = useState<UserRole>(UserRole.PUBLIC);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings>(DEFAULT_LEAGUE_SETTINGS);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Database Service layer with improved logging
  const dbService = {
    setup: async () => {
      console.log('--- DB SETUP START ---');
      try {
        await db.execute(`CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, data TEXT);`);
        await db.execute(`CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, data TEXT);`);
        await db.execute(`CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data TEXT);`);
        await db.execute(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT, teamId TEXT);`);
        console.log('✅ Turso Schema Verified');
      } catch (e) {
        console.error('❌ DB Schema Setup Failed:', e);
        throw e;
      }
    },
    fetchTeams: async () => {
      console.log('Fetching teams from Turso...');
      const res = await db.execute("SELECT data FROM teams");
      console.log(`Fetched ${res.rows.length} teams`);
      return res.rows.map(r => JSON.parse(r.data as string)) as Team[];
    },
    fetchMatches: async () => {
      console.log('Fetching matches from Turso...');
      const res = await db.execute("SELECT data FROM matches");
      console.log(`Fetched ${res.rows.length} matches`);
      return res.rows.map(r => JSON.parse(r.data as string)) as Match[];
    },
    fetchSettings: async () => {
      console.log('Fetching settings from Turso...');
      const res = await db.execute("SELECT data FROM settings WHERE id = 'global'");
      return res.rows.length > 0 ? JSON.parse(res.rows[0].data as string) as LeagueSettings : null;
    },
    saveTeam: async (team: Team) => {
      console.log(`Saving team to Turso: ${team.name}`);
      await db.execute({
        sql: "INSERT INTO teams (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
        args: [team.id, JSON.stringify(team)]
      });
      console.log(`✅ Saved: ${team.name}`);
    },
    saveMatch: async (match: Match) => {
      console.log(`Saving match to Turso: ${match.id}`);
      await db.execute({
        sql: "INSERT INTO matches (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
        args: [match.id, JSON.stringify(match)]
      });
      console.log(`✅ Saved Match: ${match.id}`);
    },
    saveSettings: async (settings: LeagueSettings) => {
      console.log('Saving settings to Turso...');
      await db.execute({
        sql: "INSERT INTO settings (id, data) VALUES ('global', ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
        args: [JSON.stringify(settings)]
      });
      console.log('✅ Saved Settings');
    },
    login: async (username: string, password: string) => {
      if (username === 'admin' && password === 'admin123') return { role: UserRole.ADMIN };
      const res = await db.execute({
        sql: "SELECT role, teamId FROM users WHERE username = ? AND password = ?",
        args: [username, password]
      });
      if (res.rows.length > 0) {
        return { role: res.rows[0].role as UserRole, teamId: res.rows[0].teamId as string };
      }
      throw new Error("Invalid credentials");
    }
  };

  useEffect(() => {
    const boot = async () => {
      // Load local cache immediately for UX
      const localT = localStorage.getItem(STORAGE_KEYS.TEAMS);
      const localM = localStorage.getItem(STORAGE_KEYS.MATCHES);
      const localS = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      
      let initialTeams = INITIAL_TEAMS;
      let initialMatches = INITIAL_MATCHES;
      let initialSettings = DEFAULT_LEAGUE_SETTINGS;

      if (localT) initialTeams = JSON.parse(localT);
      if (localM) initialMatches = JSON.parse(localM);
      if (localS) initialSettings = JSON.parse(localS);

      setTeams(initialTeams);
      setMatches(initialMatches);
      setLeagueSettings(initialSettings);

      const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        setRole(session.role);
        setSelectedTeamId(session.teamId || null);
      }
      
      setIsLoaded(true);

      // Sync with Turso Cloud
      try {
        setIsSyncing(true);
        setSyncError(null);
        await dbService.setup();
        
        const cloudT = await dbService.fetchTeams();
        const cloudM = await dbService.fetchMatches();
        const cloudS = await dbService.fetchSettings();
        
        // If cloud is empty, seed it with current local/default data
        if (cloudT.length === 0) {
          console.log("☁️ Turso cloud is empty. Starting initial seed...");
          for (const t of initialTeams) await dbService.saveTeam(t);
          for (const m of initialMatches) await dbService.saveMatch(m);
          await dbService.saveSettings(initialSettings);
          console.log("🏁 Cloud seeding complete!");
        } else {
          console.log("☁️ Syncing local state with Turso cloud data...");
          setTeams(cloudT);
          setMatches(cloudM);
          if (cloudS) setLeagueSettings(cloudS);
        }
      } catch (e) {
        console.error('❌ Turso Direct Sync Failed:', e);
        setSyncError('Database connection issue. Working in offline mode.');
      } finally {
        setIsSyncing(false);
      }
    };
    boot();
  }, []);

  // Update local storage whenever state changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(leagueSettings));
      if (role !== UserRole.PUBLIC) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ role, teamId: selectedTeamId }));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    }
  }, [teams, matches, leagueSettings, role, selectedTeamId, isLoaded]);

  const standings = useMemo(() => {
    const table: Record<string, Standing> = {};
    teams.forEach(team => {
      table[team.id] = { teamId: team.id, teamName: team.name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
    });
    matches.filter(m => m.isCompleted).forEach(match => {
      const home = table[match.homeTeamId];
      const away = table[match.awayTeamId];
      if (!home || !away) return;
      const hScore = match.homeScore || 0;
      const aScore = match.awayScore || 0;
      home.played += 1; away.played += 1;
      home.goalsFor += hScore; home.goalsAgainst += aScore;
      away.goalsFor += aScore; away.goalsAgainst += hScore;
      if (hScore > aScore) { home.won += 1; home.points += 3; away.lost += 1; }
      else if (aScore > hScore) { away.won += 1; away.points += 3; home.lost += 1; }
      else { home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1; }
      home.goalDifference = home.goalsFor - home.goalsAgainst;
      away.goalDifference = away.goalsFor - away.goalsAgainst;
    });
    return Object.values(table).sort((a, b) => b.points !== a.points ? b.points - a.points : b.goalDifference !== a.goalDifference ? b.goalDifference - a.goalDifference : b.goalsFor - a.goalsFor);
  }, [teams, matches]);

  const updateLeagueSettings = async (settings: LeagueSettings) => {
    setLeagueSettings(settings);
    try {
      await dbService.saveSettings(settings);
    } catch (e) { console.warn('Saved only locally'); }
  };

  const addTeam = async (teamData: Omit<Team, 'id' | 'players'>) => {
    const newTeam: Team = { ...teamData, id: `t${Date.now()}`, players: [] };
    setTeams(prev => [...prev, newTeam]);
    try {
      await dbService.saveTeam(newTeam);
    } catch (e) { console.warn('Saved only locally'); }
    if (role !== UserRole.ADMIN) setView('standings');
  };

  const updateMatch = async (matchId: string, hScore: number, aScore: number, scorers?: GoalScorer[], cards?: CardEvent[], refereeName?: string) => {
    const updatedMatches = matches.map(m => m.id === matchId ? { 
      ...m, 
      homeScore: hScore, 
      awayScore: aScore, 
      scorers: scorers || m.scorers, 
      cards: cards || m.cards, 
      refereeName: refereeName !== undefined ? refereeName : m.refereeName,
      isCompleted: true 
    } : m);
    setMatches(updatedMatches);
    
    const match = updatedMatches.find(m => m.id === matchId);
    if (match) {
      try {
        await dbService.saveMatch(match);
      } catch (e) { console.warn('Saved only locally'); }
    }

    if (scorers) {
      setTeams(prevTeams => {
        const newTeams = prevTeams.map(team => {
          const updatedPlayers = team.players.map(player => {
            const totalGoals = updatedMatches.reduce((acc, m) => acc + (m.scorers || []).filter(s => s.playerId === player.id).length, 0);
            return { ...player, goals: totalGoals };
          });
          return { ...team, players: updatedPlayers };
        });
        // Push team updates to cloud
        newTeams.forEach(t => dbService.saveTeam(t).catch(() => {}));
        return newTeams;
      });
    }
  };

  const updatePlayers = async (teamId: string, players: Player[]) => {
    const updatedTeams = teams.map(t => t.id === teamId ? { ...t, players } : t);
    setTeams(updatedTeams);
    const team = updatedTeams.find(t => t.id === teamId);
    if (team) {
      try {
        await dbService.saveTeam(team);
      } catch (e) { console.warn('Saved only locally'); }
    }
  };

  const importLeagueState = (data: { teams: Team[], matches: Match[], settings?: LeagueSettings, users?: any[] }) => {
    if (data.teams) setTeams(data.teams);
    if (data.matches) setMatches(data.matches);
    if (data.settings) setLeagueSettings(data.settings);
    alert('Import complete. Changes will sync to Turso on next update.');
  };

  const handleLogin = (r: UserRole, tid?: string) => {
    setRole(r);
    setSelectedTeamId(tid || null);
    setView('dashboard');
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-blue-600"><i className="fas fa-circle-notch fa-spin text-4xl"></i></div>;

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar 
        currentView={view} 
        setView={setView} 
        role={role} 
        onLogout={() => { setRole(UserRole.PUBLIC); setSelectedTeamId(null); localStorage.removeItem(STORAGE_KEYS.SESSION); setView('dashboard'); }} 
        selectedTeamId={selectedTeamId} 
        teams={teams} 
        isSyncing={isSyncing}
        syncError={syncError}
        leagueSettings={leagueSettings}
      />
      
      {syncError && (
        <div className="bg-amber-50 border-b border-amber-100 py-2 px-4 text-center">
          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center justify-center">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {syncError}
          </p>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-8 max-width-6xl">
        {(() => {
          switch (view) {
            case 'login': return <ErrorBoundary componentName="Login Module"><Login teams={teams} onLogin={handleLogin} onBack={() => setView('dashboard')} loginFn={dbService.login} /></ErrorBoundary>;
            case 'dashboard': return <ErrorBoundary componentName="Dashboard"><Dashboard teams={teams} matches={matches} standings={standings} setView={setView} leagueSettings={leagueSettings} /></ErrorBoundary>;
            case 'standings': return <ErrorBoundary componentName="Standings Table"><StandingsTable standings={standings} teams={teams} leagueSettings={leagueSettings} /></ErrorBoundary>;
            case 'registration': return <ErrorBoundary componentName="Team Registration"><TeamRegistration onRegister={addTeam} existingNames={teams.map(t => t.name)} /></ErrorBoundary>;
            case 'schedule': return <ErrorBoundary componentName="Fixture Scheduler"><MatchScheduler matches={matches} teams={teams} isAdmin={role === UserRole.ADMIN} role={role} selectedTeamId={selectedTeamId} onAddMatch={(m) => { const upd = [...matches, m]; setMatches(upd); dbService.saveMatch(m); }} onUpdateMatch={updateMatch} leagueSettings={leagueSettings} /></ErrorBoundary>;
            case 'players':
              const teamToManage = teams.find(t => t.id === selectedTeamId);
              return teamToManage ? (
                <ErrorBoundary componentName="Squad Management">
                  <PlayerManager 
                    team={teamToManage} 
                    onUpdate={(p) => updatePlayers(teamToManage.id, p)} 
                    onBack={() => setView(role === UserRole.ADMIN ? 'admin' : 'dashboard')} 
                    isAdminOverride={role === UserRole.ADMIN}
                  />
                </ErrorBoundary>
              ) : null;
            case 'admin':
              return role === UserRole.ADMIN ? (
                <ErrorBoundary componentName="Administrative Control Panel">
                  <AdminPanel 
                    teams={teams} 
                    matches={matches}
                    leagueSettings={leagueSettings}
                    onUpdateLeagueSettings={updateLeagueSettings}
                    onUpdateMatch={updateMatch} 
                    onUpdateTeam={(updated) => {
                      const updatedTeams = teams.map(t => t.id === updated.id ? updated : t);
                      setTeams(updatedTeams);
                      dbService.saveTeam(updated).catch(() => {});
                    }}
                    onRegisterTeam={addTeam}
                    onManageSquad={(tid) => { setSelectedTeamId(tid); setView('players'); }}
                    onReset={() => { 
                      if(confirm('Wipe local cache? (Cloud data remains until manually deleted)')) {
                        setTeams(INITIAL_TEAMS); 
                        setMatches(INITIAL_MATCHES); 
                        setLeagueSettings(DEFAULT_LEAGUE_SETTINGS);
                      }
                    }} 
                    onImportState={importLeagueState}
                  />
                </ErrorBoundary>
              ) : null;
            default: return <ErrorBoundary componentName="Dashboard"><Dashboard teams={teams} matches={matches} standings={standings} setView={setView} leagueSettings={leagueSettings} /></ErrorBoundary>;
          }
        })()}
      </main>
    </div>
  );
};

export default App;
