
import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ArrowRight,
  TrendingUp,
  Hash
} from 'lucide-react';

const AttendanceCalculator: React.FC = () => {
  const [attended, setAttended] = useState<number>(0);
  const [totalHeld, setTotalHeld] = useState<number>(0);

  const stats = useMemo(() => {
    if (totalHeld <= 0) return null;
    
    const currentPerc = (attended / totalHeld) * 100;
    
    // To reach 75%: (Attended + X) / (TotalHeld + X) = 0.75
    // X = 3 * TotalHeld - 4 * Attended
    const neededNow = Math.max(0, Math.ceil(3 * totalHeld - 4 * attended));

    // To fall below 75%: Attended / (TotalHeld + Y) = 0.75
    // Y = (4 * Attended - 3 * TotalHeld) / 3
    const skipLimit = Math.max(0, Math.floor((4 * attended - 3 * totalHeld) / 3));

    const isSafe = currentPerc >= 75;

    return { 
      currentPerc: Math.round(currentPerc * 10) / 10, 
      neededNow, 
      skipLimit, 
      isSafe 
    };
  }, [attended, totalHeld]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Interactive Input Header */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden p-10">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-100 shrink-0">
            <Calculator size={40} />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-slate-800">Quick Attendance Planner</h1>
            <p className="text-slate-500 font-medium">Enter your lecture totals to see your 75% eligibility status.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Total Lectures Held</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Hash size={20} />
              </div>
              <input 
                type="number" 
                min="0"
                placeholder="e.g. 40"
                className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-xl text-slate-800"
                value={totalHeld || ''}
                onChange={(e) => setTotalHeld(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Lectures You Attended</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                <CheckCircle size={20} />
              </div>
              <input 
                type="number" 
                min="0"
                placeholder="e.g. 25"
                className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-xl text-slate-800"
                value={attended || ''}
                onChange={(e) => setAttended(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {stats ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className={`rounded-[3rem] p-12 border-2 transition-all ${
            stats.isSafe ? 'bg-emerald-50 border-emerald-100 shadow-xl shadow-emerald-50' : 'bg-rose-50 border-rose-100 shadow-xl shadow-rose-50'
          }`}>
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="relative w-48 h-48 flex items-center justify-center">
                 <svg className="w-full h-full transform -rotate-90 drop-shadow-sm">
                    <circle cx="96" cy="96" r="84" fill="transparent" stroke="#fff" strokeWidth="14" />
                    <circle 
                      cx="96" cy="96" r="84" fill="transparent" 
                      stroke={stats.isSafe ? '#10b981' : '#f43f5e'} 
                      strokeWidth="14" 
                      strokeDasharray={527}
                      strokeDashoffset={527 - (527 * Math.min(stats.currentPerc, 100)) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-slate-800">{stats.currentPerc}%</span>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Accuracy</span>
                 </div>
              </div>

              <div className="flex-1 space-y-6">
                <div className="flex items-center space-x-3">
                   {stats.isSafe ? (
                     <CheckCircle className="text-emerald-600" size={32} />
                   ) : (
                     <AlertCircle className="text-rose-600 animate-pulse" size={32} />
                   )}
                   <h2 className={`text-4xl font-black ${stats.isSafe ? 'text-emerald-700' : 'text-rose-700'}`}>
                     {stats.isSafe ? 'Attendance Safe' : 'Below 75% Limit'}
                   </h2>
                </div>

                <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/50">
                  {stats.isSafe ? (
                    <div className="space-y-2">
                       <p className="text-emerald-900 text-lg">
                         Excellent! You can afford to miss up to <span className="font-black text-3xl px-2">{stats.skipLimit}</span> more lectures and still maintain your 75% eligibility.
                       </p>
                       <p className="text-emerald-700/70 text-sm font-medium">Calculation based on your input of {attended}/{totalHeld} lectures.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                       <p className="text-rose-900 text-lg">
                         Critical Status! You must attend the next <span className="font-black text-3xl px-2 underline decoration-4 decoration-rose-300">{stats.neededNow}</span> lectures consecutively to hit 75%.
                       </p>
                       <p className="text-rose-700/70 text-sm font-medium">Don't miss any upcoming classes until you reach the goal.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <TrendingUp className="text-blue-500 mb-4" size={24} />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Required Streak</p>
              <p className="text-3xl font-black text-slate-800">{stats.neededNow} Classes</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <Target className="text-indigo-500 mb-4" size={24} />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Safe Skip Limit</p>
              <p className="text-3xl font-black text-slate-800">{stats.skipLimit} Classes</p>
            </div>
            <div className="bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200">
              <Info className="text-white/20 mb-4" size={24} />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Eligibility</p>
              <p className="text-3xl font-black text-white">{stats.isSafe ? 'YES' : 'NO'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-32 text-center">
          <Target size={64} className="mx-auto text-slate-200 mb-6" />
          <h3 className="text-2xl font-black text-slate-400">Waiting for Data...</h3>
          <p className="text-slate-400 mt-2 max-w-sm mx-auto">Fill in the lecture counts above to instantly calculate your mandatory 75% attendance threshold.</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalculator;
