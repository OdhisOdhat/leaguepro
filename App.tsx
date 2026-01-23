
import React, { useState, useMemo, useEffect } from 'https://esm.sh/react@19.0.0';
import { createClient } from 'https://esm.sh/@libsql/client@0.17.0/web';
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

// Turso Cloud Configuration - Use HTTPS for browser/GitHub Pages compatibility
const TURSO_CONFIG = {
  url: "https://odhisodhat-vercel-icfg-ftcymaxmqxj9bs7ney2w5mpx.aws-us-east-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjkwODMyMjEsImlkIjoiNzA2MmVkNjItNDUwOS00YmEzLWIwYWYtNjBjY2YzNDJlMTg4IiwicmlkIjoiMDQ4ZmNlMDctMGEwOS00OGIxLTg3OWQtNTEzZGZiMWUxZmUzIn0.0i537WhP95mSF1AUrhIiakcMQebMcDFk21Q2C0d4b-YZpgJB4Plba8ox3wDDLtoFhJrsKDtr7r_E-dQ_aIDiBw"
};

const STORAGE_KEYS = {
  TEAMS: 'lp_teams_v2',
  MATCHES: 'lp_matches_v2',
  SETTINGS: 'lp_settings_v2',
  SESSION: 'lp_session_v2'
};

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
  const [dbLogs, setDbLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDbLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 20));
    console.log(`[Turso] ${msg}`);
  };

  const dbService = {
    setup: async () => {
      addLog('Verifying Cloud Database schema...');
      try {
        await db.execute(`CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, data TEXT);`);
        await db.execute(`CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, data TEXT);`);
        await db.execute(`CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data TEXT);`);
        await db.execute(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT, teamId TEXT);`);
        addLog('✅ Schema ready');
      } catch (e) {
        addLog('❌ Schema verification failed');
        throw e;
      }
    },
    saveTeam: async (team: Team) => {
      addLog(`Syncing team: ${team.name}`);
      await db.execute({
        sql: "INSERT INTO teams (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
        args: [team.id, JSON.stringify(team)]
      });
    },
    saveMatch: async (match: Match) => {
      addLog(`Syncing match: ${match.id}`);
      await db.execute({
        sql: "INSERT INTO matches (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
        args: [match.id, JSON.stringify(match)]
      });
    },
    saveSettings: async (settings: LeagueSettings) => {
      addLog('Syncing league settings...');
      await db.execute({
        sql: "INSERT INTO settings (id, data) VALUES ('global', ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
        args: [JSON.stringify(settings)]
      });
    },
    fetchCloudData: async () => {
      addLog('Pulling latest cloud state...');
      const t = await db.execute("SELECT data FROM teams");
      const m = await db.execute("SELECT data FROM matches");
      const s = await db.execute("SELECT data FROM settings WHERE id = 'global'");
      return {
        teams: t.rows.map(r => JSON.parse(r.data as string)) as Team[],
        matches: m.rows.map(r => JSON.parse(r.data as string)) as Match[],
        settings: s.rows.length > 0 ? JSON.parse(s.rows[0].data as string) as LeagueSettings : null
      };
    },
    login: async (username: string, password: string) => {
      if (username === 'admin' && password === 'admin123') return { role: UserRole.ADMIN };
      const res = await db.execute({
        sql: "SELECT role, teamId FROM users WHERE username = ? AND password = ?",
        args: [username, password]
      });
      if (res.rows.length > 0) return { role: res.rows[0].role as UserRole, teamId: res.rows[0].teamId as string };
      throw new Error("Invalid credentials");
    }
  };

  useEffect(() => {
    const boot = async () => {
      addLog('Starting application boot...');
      const localT = localStorage.getItem(STORAGE_KEYS.TEAMS);
      const localM = localStorage.getItem(STORAGE_KEYS.MATCHES);
      const localS = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      
      const currentTeams = localT ? JSON.parse(localT) : INITIAL_TEAMS;
      const currentMatches = localM ? JSON.parse(localM) : INITIAL_MATCHES;
      const currentSettings = localS ? JSON.parse(localS) : DEFAULT_LEAGUE_SETTINGS;

      setTeams(currentTeams);
      setMatches(currentMatches);
      setLeagueSettings(currentSettings);

      const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        setRole(session.role);
        setSelectedTeamId(session.teamId || null);
      }
      setIsLoaded(true);

      try {
        setIsSyncing(true);
        await dbService.setup();
        const cloudData = await dbService.fetchCloudData();
        
        if (cloudData.teams.length === 0) {
          addLog("☁️ Cloud empty - Auto-seeding database...");
          for (const t of currentTeams) await dbService.saveTeam(t);
          for (const m of currentMatches) await dbService.saveMatch(m);
          await dbService.saveSettings(currentSettings);
          addLog("🏁 Initial seeding complete");
        } else {
          setTeams(cloudData.teams);
          setMatches(cloudData.matches);
          if (cloudData.settings) setLeagueSettings(cloudData.settings);
          addLog("✅ Cloud sync successful");
        }
      } catch (e) {
        setSyncError("Cloud connection failed. Using local storage.");
        addLog(`❌ Sync Error: ${e instanceof Error ? e.message : 'Unknown'}`);
      } finally {
        setIsSyncing(false);
      }
    };
    boot();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(leagueSettings));
      if (role !== UserRole.PUBLIC) localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ role, teamId: selectedTeamId }));
      else localStorage.removeItem(STORAGE_KEYS.SESSION);
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

  const forcePushToCloud = async () => {
    try {
      setIsSyncing(true);
      addLog("Starting manual Cloud Force Push...");
      for (const t of teams) await dbService.saveTeam(t);
      for (const m of matches) await dbService.saveMatch(m);
      await dbService.saveSettings(leagueSettings);
      addLog("✅ Force Push successful!");
      setSyncError(null);
    } catch (e) {
      addLog("❌ Force Push failed");
      setSyncError("Sync failed. Check connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-blue-600"><i className="fas fa-circle-notch fa-spin text-4xl"></i></div>;

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar 
        currentView={view} setView={setView} role={role} 
        onLogout={() => { setRole(UserRole.PUBLIC); setSelectedTeamId(null); setView('dashboard'); }} 
        selectedTeamId={selectedTeamId} teams={teams} 
        isSyncing={isSyncing} syncError={syncError} leagueSettings={leagueSettings}
      />
      
      {isSyncing && (
        <div className="fixed top-0 left-0 w-full h-1 bg-blue-100 z-[100]">
          <div className="h-full bg-blue-600 animate-[progress_1.5s_infinite_linear]" style={{width: '30%'}}></div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-8 max-width-6xl">
        <ErrorBoundary componentName={`View: ${view}`}>
          {(() => {
            switch (view) {
              case 'login': return <Login teams={teams} onLogin={(r, t) => { setRole(r); setSelectedTeamId(t || null); setView('dashboard'); }} onBack={() => setView('dashboard')} loginFn={dbService.login} />;
              case 'dashboard': return <Dashboard teams={teams} matches={matches} standings={standings} setView={setView} leagueSettings={leagueSettings} />;
              case 'standings': return <StandingsTable standings={standings} teams={teams} leagueSettings={leagueSettings} />;
              case 'registration': return <TeamRegistration onRegister={(tData) => { 
                  const newTeam = { ...tData, id: `t${Date.now()}`, players: [] };
                  setTeams(p => [...p, newTeam]);
                  dbService.saveTeam(newTeam).catch(() => {});
                  setView('standings');
                }} existingNames={teams.map(t => t.name)} />;
              case 'schedule': return <MatchScheduler 
                matches={matches} teams={teams} isAdmin={role === UserRole.ADMIN} role={role} 
                selectedTeamId={selectedTeamId} onAddMatch={(m) => { setMatches(p => [...p, m]); dbService.saveMatch(m).catch(() => {}); }} 
                onUpdateMatch={(id, h, a, sc, c, r) => {
                  const updated = matches.map(m => m.id === id ? { ...m, homeScore: h, awayScore: a, scorers: sc, cards: c, refereeName: r, isCompleted: true } : m);
                  setMatches(updated);
                  const m = updated.find(u => u.id === id);
                  if (m) dbService.saveMatch(m).catch(() => {});
                }} 
                leagueSettings={leagueSettings} 
              />;
              case 'admin': return <AdminPanel 
                teams={teams} matches={matches} leagueSettings={leagueSettings}
                onUpdateLeagueSettings={(s) => { setLeagueSettings(s); dbService.saveSettings(s).catch(() => {}); }}
                onUpdateMatch={() => {}} 
                onUpdateTeam={(t) => { setTeams(p => p.map(u => u.id === t.id ? t : u)); dbService.saveTeam(t).catch(() => {}); }}
                onRegisterTeam={() => {}} 
                onManageSquad={(tid) => { setSelectedTeamId(tid); setView('players'); }}
                onReset={() => { if(confirm('Reset local data?')) { setTeams(INITIAL_TEAMS); setMatches(INITIAL_MATCHES); } }} 
                onImportState={() => {}}
                dbLogs={dbLogs}
                onForceSync={forcePushToCloud}
              />;
              case 'players':
                const teamToManage = teams.find(t => t.id === selectedTeamId);
                return teamToManage ? <PlayerManager team={teamToManage} onUpdate={(p) => { 
                  const updated = { ...teamToManage, players: p };
                  setTeams(teams.map(t => t.id === teamToManage.id ? updated : t));
                  dbService.saveTeam(updated).catch(() => {});
                }} onBack={() => setView(role === UserRole.ADMIN ? 'admin' : 'dashboard')} isAdminOverride={role === UserRole.ADMIN} /> : null;
              default: return <Dashboard teams={teams} matches={matches} standings={standings} setView={setView} leagueSettings={leagueSettings} />;
            }
          })()}
        </ErrorBoundary>
      </main>
      <style>{`@keyframes progress { 0% { left: -30%; } 100% { left: 100%; } }`}</style>
    </div>
  );
};

export default App;
