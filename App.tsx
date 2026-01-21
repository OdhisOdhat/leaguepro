
import React, { useState, useMemo, useEffect } from 'react';
import { Team, Match, Player, Standing, UserRole, GoalScorer, CardEvent } from './types';
import { INITIAL_TEAMS, INITIAL_MATCHES } from './constants';
import Dashboard from './components/Dashboard';
import TeamRegistration from './components/TeamRegistration';
import StandingsTable from './components/StandingsTable';
import MatchScheduler from './components/MatchScheduler';
import AdminPanel from './components/AdminPanel';
import PlayerManager from './components/PlayerManager';
import Navbar from './components/Navbar';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';

const API_BASE = 'http://localhost:3001/api';

const LeagueAPI = {
  getTeams: async (): Promise<Team[]> => {
    try {
      const res = await fetch(`${API_BASE}/teams`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      const data = localStorage.getItem('lp_teams');
      return data ? JSON.parse(data) : INITIAL_TEAMS;
    }
  },
  getMatches: async (): Promise<Match[]> => {
    try {
      const res = await fetch(`${API_BASE}/matches`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      const data = localStorage.getItem('lp_matches');
      return data ? JSON.parse(data) : INITIAL_MATCHES;
    }
  },
  saveTeam: async (team: Team) => {
    try {
      await fetch(`${API_BASE}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(team)
      });
    } catch (e) { console.warn('Offline mode: saving team to local storage'); }
  },
  updateMatch: async (match: Match) => {
    try {
      await fetch(`${API_BASE}/matches/${match.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(match)
      });
    } catch (e) { console.warn('Offline mode: saving match to local storage'); }
  },
  login: async (username: string, password: string): Promise<{role: UserRole, teamId?: string}> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) throw new Error('Invalid credentials');
      return await res.json();
    } catch (err: any) {
      if (err.message.includes('fetch') || err.message === 'Failed to fetch' || !window.navigator.onLine) {
        if (username === 'admin' && password === 'admin123') {
          return { role: UserRole.ADMIN };
        }
        const localUsers = JSON.parse(localStorage.getItem('lp_local_users') || '[]');
        const user = localUsers.find((u: any) => u.username === username && u.password === password);
        if (user) return { role: user.role, teamId: user.teamId };
      }
      throw new Error('Invalid username or password');
    }
  }
};

const App: React.FC = () => {
  const [view, setView] = useState<string>('dashboard');
  const [role, setRole] = useState<UserRole>(UserRole.PUBLIC);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const t = await LeagueAPI.getTeams();
      const m = await LeagueAPI.getMatches();
      const savedRole = localStorage.getItem('lp_role');
      const savedSelectedTeam = localStorage.getItem('lp_selectedTeam');

      setTeams(t);
      setMatches(m);
      if (savedRole) setRole(savedRole as UserRole);
      if (savedSelectedTeam) setSelectedTeamId(savedSelectedTeam);
      setIsLoaded(true);
    };
    initData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('lp_teams', JSON.stringify(teams));
      localStorage.setItem('lp_matches', JSON.stringify(matches));
      localStorage.setItem('lp_role', role);
      if (selectedTeamId) localStorage.setItem('lp_selectedTeam', selectedTeamId);
      else localStorage.removeItem('lp_selectedTeam');
    }
  }, [teams, matches, role, selectedTeamId, isLoaded]);

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

  const addTeam = async (teamData: Omit<Team, 'id' | 'players'>) => {
    const newTeam: Team = { ...teamData, id: `t${Date.now()}`, players: [] };
    setTeams(prev => [...prev, newTeam]);
    await LeagueAPI.saveTeam(newTeam);
    // If admin added the team, we stay on current view or go to admin
    if (role !== UserRole.ADMIN) setView('standings');
  };

  const updateMatch = async (matchId: string, hScore: number, aScore: number, scorers?: GoalScorer[], cards?: CardEvent[]) => {
    const updatedMatches = matches.map(m => m.id === matchId ? { ...m, homeScore: hScore, awayScore: aScore, scorers: scorers || m.scorers, cards: cards || m.cards, isCompleted: true } : m);
    setMatches(updatedMatches);
    const match = updatedMatches.find(m => m.id === matchId);
    if (match) await LeagueAPI.updateMatch(match);

    if (scorers) {
      setTeams(prevTeams => {
        const newTeams = prevTeams.map(team => {
          const updatedPlayers = team.players.map(player => {
            const totalGoals = updatedMatches.reduce((acc, m) => acc + (m.scorers || []).filter(s => s.playerId === player.id).length, 0);
            return { ...player, goals: totalGoals };
          });
          return { ...team, players: updatedPlayers };
        });
        newTeams.forEach(t => LeagueAPI.saveTeam(t));
        return newTeams;
      });
    }
  };

  const updatePlayers = async (teamId: string, players: Player[]) => {
    setTeams(prev => {
      const newTeams = prev.map(t => t.id === teamId ? { ...t, players } : t);
      const updated = newTeams.find(t => t.id === teamId);
      if (updated) LeagueAPI.saveTeam(updated);
      return newTeams;
    });
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-blue-600"><i className="fas fa-circle-notch fa-spin text-4xl"></i></div>;

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar currentView={view} setView={setView} role={role} onLogout={() => { setRole(UserRole.PUBLIC); setSelectedTeamId(null); setView('dashboard'); }} selectedTeamId={selectedTeamId} teams={teams} />
      <main className="flex-1 container mx-auto px-4 py-8 max-width-6xl">
        {(() => {
          switch (view) {
            case 'login': return <ErrorBoundary componentName="Login Module"><Login teams={teams} onLogin={(r, tid) => { setRole(r); if (tid) setSelectedTeamId(tid); setView('dashboard'); }} onBack={() => setView('dashboard')} loginFn={LeagueAPI.login} /></ErrorBoundary>;
            case 'dashboard': return <ErrorBoundary componentName="Dashboard"><Dashboard teams={teams} matches={matches} standings={standings} setView={setView} /></ErrorBoundary>;
            case 'standings': return <ErrorBoundary componentName="Standings Table"><StandingsTable standings={standings} teams={teams} /></ErrorBoundary>;
            case 'registration': return <ErrorBoundary componentName="Team Registration"><TeamRegistration onRegister={addTeam} existingNames={teams.map(t => t.name)} /></ErrorBoundary>;
            case 'schedule': return <ErrorBoundary componentName="Fixture Scheduler"><MatchScheduler matches={matches} teams={teams} isAdmin={role === UserRole.ADMIN} role={role} selectedTeamId={selectedTeamId} onAddMatch={(m) => setMatches([...matches, m])} onUpdateMatch={updateMatch} /></ErrorBoundary>;
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
                    onUpdateMatch={updateMatch} 
                    onUpdateTeam={(updated) => setTeams(teams.map(t => t.id === updated.id ? updated : t))}
                    onRegisterTeam={addTeam}
                    onManageSquad={(tid) => { setSelectedTeamId(tid); setView('players'); }}
                    onReset={() => { setTeams(INITIAL_TEAMS); setMatches(INITIAL_MATCHES); }} 
                  />
                </ErrorBoundary>
              ) : null;
            default: return <ErrorBoundary componentName="Dashboard"><Dashboard teams={teams} matches={matches} standings={standings} setView={setView} /></ErrorBoundary>;
          }
        })()}
      </main>
    </div>
  );
};

export default App;
