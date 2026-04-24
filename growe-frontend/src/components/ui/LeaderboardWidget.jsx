import { useState, useEffect } from 'react';
import api from '../../services/api';
import Avatar from './Avatar';

export default function LeaderboardWidget() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/users/leaderboard')
      .then(res => {
        if (active) {
          setLeaders(res.data.leaderboard || []);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load leaderboard', err);
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm animate-pulse h-64">
        <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-lg mb-6 mx-auto"></div>
        <div className="space-y-4">
          <div className="h-10 w-full bg-slate-100 dark:bg-slate-700/50 rounded-xl"></div>
          <div className="h-10 w-full bg-slate-100 dark:bg-slate-700/50 rounded-xl"></div>
          <div className="h-10 w-full bg-slate-100 dark:bg-slate-700/50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      {/* Dynamic Background */}
      <div className="absolute top-0 right-0 -m-8 w-32 h-32 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-[40px] z-0"></div>
      <div className="absolute bottom-0 left-0 -m-8 w-32 h-32 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-[40px] z-0"></div>
      
      <div className="relative z-10 flex items-center justify-between mb-6 border-b border-slate-200/50 dark:border-slate-700/50 pb-4">
        <h3 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>🏆</span> Top Scholars
        </h3>
        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Total XP</span>
      </div>

      <ul className="relative z-10 space-y-3">
        {leaders.length === 0 && (
          <li className="text-center text-sm text-slate-500 py-4">No XP earned yet! Start studying.</li>
        )}
        {leaders.map((user, index) => (
          <li 
            key={user.id} 
            className="flex items-center justify-between p-3 rounded-2xl bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-200/50 dark:hover:border-slate-600/50 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 text-center font-bold text-slate-400 dark:text-slate-500 group-hover:text-amber-500 transition-colors">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
              </div>
              <Avatar src={user.avatar_url} name={user.display_name} email={user.email} size="sm" className="ring-2 ring-white/50 dark:ring-slate-700/50" />
              <div className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                {user.display_name || user.email.split('@')[0]}
              </div>
            </div>
            <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-full text-xs shadow-inner">
              {user.xp} XP
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
