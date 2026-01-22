
import React, { useState, useMemo, useEffect } from 'react';
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

const API_BASE = '/api';

const STORAGE_KEYS = {
  TEAMS: 'lp_teams_v2',
  MATCHES: 'lp_matches_v2',
  SETTINGS: 'lp_settings_v2',
  USERS: 'lp_local_users_v2',
  ROLE: 'lp_role_v2',
  SELECTED_TEAM: 'lp_selectedTeam_v2',
  SESSION: 'lp_session_v2'
};

const LeagueAPI = {
  loadLocalData: () => {
    const teams = localStorage.getItem(STORAGE_KEYS.TEAMS);
    const matches = localStorage.getItem(STORAGE_KEYS.MATCHES);
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return {
      teams: teams ? JSON.parse(teams) : INITIAL_TEAMS,
      matches: matches ? JSON.parse(matches) : INITIAL_MATCHES,
      settings: settings ? JSON.parse(settings) : DEFAULT_LEAGUE_SETTINGS
    };
  },

  fetchTeams: async (): Promise<Team[]> => {
    const res = await fetch(`${API_BASE}/teams`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  fetchMatches: async (): Promise<Match[]> => {
    const res = await fetch(`${API_BASE}/matches`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  fetchSettings: async (): Promise<LeagueSettings> => {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  saveTeam: async (team: Team) => {
    await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(team)
    });
  },

  saveMatch: async (match: Match) => {
    await fetch(`${API_BASE}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(match)
    });
  },

  saveSettings: async (settings: LeagueSettings) => {
    await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  },

  login: async (username: string, password: string): Promise<{role: UserRole, teamId?: string}> => {
    if (username === 'admin' && password === 'admin123') {
      return { role: UserRole.ADMIN };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (res.ok) return res.json();
      throw new Error('Cloud auth failed');
    } catch (err) {
      console.warn('Remote auth failed, checking local storage fallback...');
      const localUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      const user = localUsers.find((u: any) => u.username === username && u.password === password);
      if (user) return { role: user.role, teamId: user.teamId };
      throw new Error('Invalid credentials or authentication server unreachable.');
    }
  }
};

const App: React.FC = () => {
  const [view, setView] = useState<string>('dashboard');
  const [role, setRole] = useState<UserRole>(UserRole.PUBLIC);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings>(DEFAULT_LEAGUE_SETTINGS);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const boot = async () => {
      const { teams: localT, matches: localM, settings: localS } = LeagueAPI.loadLocalData();
      setTeams(localT);
      setMatches(localM);
      setLeagueSettings(localS);
      
      const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        setRole(session.role);
        setSelectedTeamId(session.teamId || null);
      }
      
      setIsLoaded(true);

      try {
        setIsSyncing(true);
        const [cloudT, cloudM, cloudS] = await Promise.all([
          LeagueAPI.fetchTeams(),
          LeagueAPI.fetchMatches(),
          LeagueAPI.fetchSettings()
        ]);
        if (cloudT.length > 0) setTeams(cloudT);
        if (cloudM.length > 0) setMatches(cloudM);
        if (cloudS) setLeagueSettings(cloudS);
      } catch (e) {
        console.warn('Cloud sync unavailable');
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
      await LeagueAPI.saveSettings(settings);
    } catch (e) { console.warn('Saved locally'); }
  };

  const addTeam = async (teamData: Omit<Team, 'id' | 'players'>) => {
    const newTeam: Team = { ...teamData, id: `t${Date.now()}`, players: [] };
    const updated = [...teams, newTeam];
    setTeams(updated);
    try {
      await LeagueAPI.saveTeam(newTeam);
    } catch (e) { console.warn('Saved locally'); }
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
        await LeagueAPI.saveMatch(match);
      } catch (e) { console.warn('Saved locally'); }
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
        newTeams.forEach(t => LeagueAPI.saveTeam(t).catch(() => {}));
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
        await LeagueAPI.saveTeam(team);
      } catch (e) { console.warn('Saved locally'); }
    }
  };

  const importLeagueState = (data: { teams: Team[], matches: Match[], settings?: LeagueSettings, users?: any[] }) => {
    if (data.teams) setTeams(data.teams);
    if (data.matches) setMatches(data.matches);
    if (data.settings) setLeagueSettings(data.settings);
    alert('League data imported successfully!');
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
        leagueSettings={leagueSettings}
      />
      <main className="flex-1 container mx-auto px-4 py-8 max-width-6xl">
        {(() => {
          switch (view) {
            case 'login': return <ErrorBoundary componentName="Login Module"><Login teams={teams} onLogin={handleLogin} onBack={() => setView('dashboard')} loginFn={LeagueAPI.login} /></ErrorBoundary>;
            case 'dashboard': return <ErrorBoundary componentName="Dashboard"><Dashboard teams={teams} matches={matches} standings={standings} setView={setView} leagueSettings={leagueSettings} /></ErrorBoundary>;
            case 'standings': return <ErrorBoundary componentName="Standings Table"><StandingsTable standings={standings} teams={teams} leagueSettings={leagueSettings} /></ErrorBoundary>;
            case 'registration': return <ErrorBoundary componentName="Team Registration"><TeamRegistration onRegister={addTeam} existingNames={teams.map(t => t.name)} /></ErrorBoundary>;
            case 'schedule': return <ErrorBoundary componentName="Fixture Scheduler"><MatchScheduler matches={matches} teams={teams} isAdmin={role === UserRole.ADMIN} role={role} selectedTeamId={selectedTeamId} onAddMatch={(m) => setMatches([...matches, m])} onUpdateMatch={updateMatch} leagueSettings={leagueSettings} /></ErrorBoundary>;
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
                      LeagueAPI.saveTeam(updated).catch(() => {});
                    }}
                    onRegisterTeam={addTeam}
                    onManageSquad={(tid) => { setSelectedTeamId(tid); setView('players'); }}
                    onReset={() => { 
                      if(confirm('This will wipe all local data. Continue?')) {
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
