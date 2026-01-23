
import React, { useState } from 'https://esm.sh/react@19.0.0';
import { Team, Match, Standing, LeagueSettings, UserRole, NewsItem } from '../types.ts';

interface DashboardProps {
  teams: Team[];
  matches: Match[];
  standings: Standing[];
  news: NewsItem[];
  setView: (v: string) => void;
  leagueSettings: LeagueSettings;
  role?: UserRole;
  selectedTeamId?: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  teams, matches, standings, news, setView, leagueSettings, role, selectedTeamId 
}) => {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const upcomingMatches = matches
    .filter(m => !m.isCompleted)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const nextMatch = upcomingMatches[0];
  const topTeams = standings.slice(0, 3);
  const isManagerWithoutTeam = role === UserRole.TEAM_MANAGER && !selectedTeamId;

  const getTeam = (id: string) => teams.find(t => t.id === id);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className={`relative overflow-hidden rounded-[3rem] p-8 md:p-12 text-white shadow-2xl transition-all duration-700 ${
        isManagerWithoutTeam 
          ? 'bg-gradient-to-br from-indigo-600 via-blue-700 to-blue-900 ring-8 ring-blue-50' 
          : 'bg-gradient-to-br from-blue-700 to-indigo-900'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left space-y-4 flex-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">League Live • {leagueSettings.season}</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1]">
              {isManagerWithoutTeam ? (
                <>Ready to lead your <span className="text-blue-300">own squad?</span></>
              ) : (
                <>Welcome to <span className="text-blue-300">{leagueSettings.name}</span></>
              )}
            </h1>

            <p className="text-blue-100 text-lg opacity-90 max-w-2xl leading-relaxed">
              {isManagerWithoutTeam 
                ? "You've successfully joined as a manager. The next step is to register your club and begin building your championship-winning squad." 
                : leagueSettings.description}
            </p>

            <div className="pt-4 flex flex-wrap gap-4 justify-center md:justify-start">
              {isManagerWithoutTeam ? (
                <button 
                  onClick={() => setView('registration')}
                  className="bg-white text-blue-700 px-10 py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-50 transition-all shadow-2xl hover:scale-105 active:scale-95 flex items-center space-x-3"
                >
                  <i className="fas fa-plus-circle text-lg"></i>
                  <span>Register My Team Now</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setView('registration')}
                    className="bg-white text-blue-700 px-8 py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-blue-50 transition-all shadow-xl"
                  >
                    Register a Team
                  </button>
                  <button 
                    onClick={() => setView('schedule')}
                    className="bg-blue-600/30 backdrop-blur border border-blue-400/30 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-blue-600/50 transition-all"
                  >
                    View Fixtures
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="hidden lg:block relative">
             <div className="absolute inset-0 bg-blue-400 blur-[100px] opacity-20 animate-pulse"></div>
             <i className="fas fa-trophy text-[180px] text-white/10 absolute -top-20 -right-10 rotate-12"></i>
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[3rem] shadow-2xl transform hover:rotate-2 transition-transform duration-500">
                <i className="fas fa-shield-alt text-8xl text-blue-300/40"></i>
             </div>
          </div>
        </div>
      </div>

      {/* League News Section */}
      {news.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">League Updates & News</h3>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">Latest Posts</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.slice(0, 3).map(item => (
              <div 
                key={item.id} 
                onClick={() => setSelectedNews(item)}
                className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all cursor-pointer flex flex-col"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img src={item.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000&auto=format&fit=crop'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                  {item.important && (
                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                      Important
                    </div>
                  )}
                </div>
                <div className="p-6 space-y-3 flex-1">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <h4 className="text-xl font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">{item.title}</h4>
                  <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{item.content}</p>
                </div>
                <div className="p-6 pt-0">
                  <div className="flex items-center text-xs font-black text-gray-900 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                    Read Story <i className="fas fa-arrow-right ml-2 text-blue-500"></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Next Match Card */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-gray-100 shadow-sm p-8 hover:shadow-xl transition-all">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Featured Match</h3>
            <button onClick={() => setView('schedule')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Full Schedule <i className="fas fa-arrow-right ml-1"></i></button>
          </div>

          {nextMatch ? (
            <div className="flex flex-col md:flex-row items-center justify-between bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100 group">
              <div className="flex flex-col items-center space-y-4 w-full md:w-1/3">
                <img src={getTeam(nextMatch.homeTeamId)?.logo} className="w-24 h-24 rounded-full shadow-lg bg-white p-2 object-cover border-4 border-white" alt="" />
                <span className="font-black text-gray-900 text-xl text-center leading-tight">{getTeam(nextMatch.homeTeamId)?.name}</span>
              </div>
              
              <div className="flex flex-col items-center justify-center py-8 md:py-0 w-full md:w-1/3">
                <div className="bg-white px-6 py-2 rounded-full shadow-sm border border-gray-100 mb-4 text-xs font-black text-blue-600 uppercase tracking-[0.3em]">VS</div>
                <div className="text-4xl font-black text-gray-900 tracking-tighter">{nextMatch.time}</div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">{new Date(nextMatch.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</div>
              </div>

              <div className="flex flex-col items-center space-y-4 w-full md:w-1/3">
                <img src={getTeam(nextMatch.awayTeamId)?.logo} className="w-24 h-24 rounded-full shadow-lg bg-white p-2 object-cover border-4 border-white" alt="" />
                <span className="font-black text-gray-900 text-xl text-center leading-tight">{getTeam(nextMatch.awayTeamId)?.name}</span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-[2.5rem] p-16 text-center text-gray-400 border-2 border-dashed border-gray-200">
              <i className="fas fa-calendar-day text-5xl mb-4 opacity-20"></i>
              <p className="font-black text-gray-900 uppercase tracking-widest">No Matches Scheduled</p>
            </div>
          )}
        </div>

        {/* Leaderboard Card */}
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-8 flex flex-col hover:shadow-xl transition-all">
          <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Leaderboard</h3>
          <div className="space-y-4 flex-1">
            {topTeams.map((s, idx) => (
              <div key={s.teamId} className="group flex items-center justify-between p-5 rounded-[2rem] bg-gray-50 border border-transparent hover:border-blue-100 hover:bg-white transition-all cursor-default">
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm ${
                    idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900' : 
                    idx === 1 ? 'bg-gradient-to-br from-gray-200 to-gray-400 text-gray-700' : 
                    'bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900'
                  }`}>
                    {idx + 1}
                  </div>
                  <img src={getTeam(s.teamId)?.logo} className="w-10 h-10 rounded-full bg-white p-0.5 border border-gray-100 shadow-sm" alt="" />
                  <span className="font-black text-gray-800 text-sm truncate max-w-[120px]">{s.teamName}</span>
                </div>
                <div className="text-right">
                  <div className="text-blue-600 font-black text-lg leading-none">{s.points}</div>
                  <div className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mt-1">PTS • GD {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</div>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setView('standings')}
            className="w-full mt-6 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-lg"
          >
            Full Standings Table
          </button>
        </div>
      </div>

      {/* News Reader Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-8">
             <div className="relative h-[40vh] md:h-[50vh]">
                <img src={selectedNews.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000&auto=format&fit=crop'} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-8 right-8 w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all shadow-xl"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
                {selectedNews.important && (
                  <div className="absolute bottom-8 left-8 bg-red-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl">
                    Important Announcement
                  </div>
                )}
             </div>
             <div className="p-8 md:p-16 -mt-20 relative bg-white rounded-t-[4rem]">
                <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-4">
                  Posted on {new Date(selectedNews.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight mb-8">
                  {selectedNews.title}
                </h2>
                <div className="prose prose-xl text-gray-600 max-w-none space-y-6">
                  {selectedNews.content.split('\n').map((para, i) => (
                    <p key={i} className="leading-relaxed text-lg">{para}</p>
                  ))}
                </div>
                <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center">
                   <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <i className="fas fa-shield-alt"></i>
                      </div>
                      <span className="text-sm font-black text-gray-400 uppercase tracking-widest">League Media Team</span>
                   </div>
                   <button 
                    onClick={() => setSelectedNews(null)}
                    className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl"
                  >
                    Close Article
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
