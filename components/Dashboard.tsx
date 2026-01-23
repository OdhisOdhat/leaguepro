
import React from 'https://esm.sh/react@19.0.0';
import { Team, Match, Standing, LeagueSettings } from '../types.ts';

interface DashboardProps {
  teams: Team[];
  matches: Match[];
  standings: Standing[];
  setView: (v: string) => void;
  leagueSettings: LeagueSettings;
}

const Dashboard: React.FC<DashboardProps> = ({ teams, matches, standings, setView, leagueSettings }) => {
  const upcomingMatches = matches
    .filter(m => !m.isCompleted)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const nextMatch = upcomingMatches[0];
  const topTeams = standings.slice(0, 3);

  const getTeam = (id: string) => teams.find(t => t.id === id);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-900 p-8 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left space-y-2 flex-1">
            <h1 className="text-4xl font-black tracking-tight flex items-center justify-center md:justify-start">
              {leagueSettings.logo && <img src={leagueSettings.logo} className="h-12 mr-4" alt="" />}
              Welcome to {leagueSettings.name}
            </h1>
            <p className="text-blue-100 text-lg opacity-90 max-w-2xl">{leagueSettings.description}</p>
            <div className="pt-4 flex flex-wrap gap-3 justify-center md:justify-start">
              <button 
                onClick={() => setView('registration')}
                className="bg-white text-blue-700 px-6 py-2.5 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg"
              >
                Register a Team
              </button>
              <button 
                onClick={() => setView('schedule')}
                className="bg-blue-600/30 backdrop-blur border border-blue-400/30 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-600/50 transition-colors"
              >
                View Fixtures
              </button>
            </div>
          </div>
          <div className="hidden lg:block">
            <i className="fas fa-running text-[160px] opacity-10 absolute -right-10 -bottom-10 rotate-12"></i>
            <i className="fas fa-futbol text-[120px] opacity-20"></i>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Next Match Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-gray-900">Featured Match</h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">Upcoming</span>
          </div>

          {nextMatch ? (
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="flex flex-col items-center space-y-3 w-1/3">
                <img src={getTeam(nextMatch.homeTeamId)?.logo} className="w-20 h-20 rounded-full shadow-md bg-white p-1" alt="" />
                <span className="font-bold text-gray-900 text-lg text-center">{getTeam(nextMatch.homeTeamId)?.name}</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="text-sm font-black text-gray-400">VS</div>
                <div className="text-2xl font-black text-gray-900">{nextMatch.time}</div>
                <div className="text-xs text-gray-500 font-medium">{new Date(nextMatch.date).toLocaleDateString()}</div>
              </div>
              <div className="flex flex-col items-center space-y-3 w-1/3">
                <img src={getTeam(nextMatch.awayTeamId)?.logo} className="w-20 h-20 rounded-full shadow-md bg-white p-1" alt="" />
                <span className="font-bold text-gray-900 text-lg text-center">{getTeam(nextMatch.awayTeamId)?.name}</span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-12 text-center text-gray-400">
              <i className="fas fa-calendar-day text-4xl mb-3 block"></i>
              No upcoming matches scheduled.
            </div>
          )}
        </div>

        {/* Top 3 Standings */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-xl font-black text-gray-900 mb-6">Leaderboard</h3>
          <div className="space-y-4">
            {topTeams.map((s, idx) => (
              <div key={s.teamId} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-yellow-400 text-yellow-900' : 
                    idx === 1 ? 'bg-gray-300 text-gray-700' : 
                    'bg-orange-300 text-orange-900'
                  }`}>
                    {idx + 1}
                  </span>
                  <img src={getTeam(s.teamId)?.logo} className="w-8 h-8 rounded-full" alt="" />
                  <span className="font-bold text-gray-800 text-sm truncate max-w-[100px]">{s.teamName}</span>
                </div>
                <div className="text-right">
                  <div className="text-blue-600 font-black">{s.points} PTS</div>
                  <div className="text-[10px] text-gray-400 font-bold">GD {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</div>
                </div>
              </div>
            ))}
            {topTeams.length === 0 && <div className="text-center py-10 text-gray-400 italic">Table is currently empty</div>}
            <button 
              onClick={() => setView('standings')}
              className="w-full mt-2 text-center text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              View Full Standings <i className="fas fa-arrow-right ml-1"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
