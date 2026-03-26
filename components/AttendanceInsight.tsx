
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  BarChart3, 
  ArrowRight, 
  Calculator, 
  Info,
  TrendingUp,
  TrendingDown,
  Target
} from 'lucide-react';
import { Student, AttendanceRecord } from '../types';

interface AttendanceInsightProps {
  students: Student[];
  attendance: AttendanceRecord[];
}

const AttendanceInsight: React.FC<AttendanceInsightProps> = ({ students, attendance }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [estimatedTotal, setEstimatedTotal] = useState<number>(40); // Default estimate for a semester

  // Calculate unique academic days held so far
  const totalDaysHeld = useMemo(() => {
    const dates = new Set(attendance.map(r => r.date));
    return Math.max(dates.size, 1);
  }, [attendance]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const stats = useMemo(() => {
    if (!selectedStudentId) return null;
    
    const studentRecords = attendance.filter(r => r.studentId === selectedStudentId);
    const attended = new Set(studentRecords.filter(r => r.status === 'IN' || r.status === 'OUT').map(r => r.date)).size;
    const currentPercentage = (attended / totalDaysHeld) * 100;
    
    // THE MATH:
    // To reach 75%: (Attended + X) / (TotalHeld + X) = 0.75
    // Solve for X: X = 3 * TotalHeld - 4 * Attended
    const neededToReach75 = Math.max(0, Math.ceil(3 * totalDaysHeld - 4 * attended));

    // To fall below 75%: Attended / (TotalHeld + Y) = 0.75
    // Solve for Y: Y = (4 * Attended - 3 * TotalHeld) / 3
    const canMissBeforeDanger = Math.max(0, Math.floor((4 * attended - 3 * totalDaysHeld) / 3));

    const isSafe = currentPercentage >= 75;

    return { 
      attended, 
      currentPercentage: Math.round(currentPercentage), 
      neededToReach75, 
      canMissBeforeDanger, 
      isSafe,
      history: studentRecords.slice(-3).reverse() 
    };
  }, [selectedStudentId, attendance, totalDaysHeld]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Search & Header Section */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Calculator size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800">Attendance Smart Planner</h3>
              <p className="text-slate-500 text-sm">Target: <span className="text-indigo-600 font-bold">75% Mandatory Attendance</span></p>
            </div>
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Enter Student Name or ID..."
              className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(s => (
                    <button 
                      key={s.id}
                      onClick={() => {
                        setSelectedStudentId(s.id);
                        setSearchQuery('');
                      }}
                      className="w-full px-6 py-4 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-800 group-hover:text-indigo-600">{s.name}</p>
                        <p className="text-xs text-slate-500">ID: {s.id} • {s.course}</p>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500" />
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm">Student not found in registry.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!selectedStudent ? (
        <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[32px] p-24 text-center">
          <div className="inline-flex p-6 bg-white rounded-full shadow-inner mb-6">
            <Target size={48} className="text-slate-300" />
          </div>
          <h4 className="text-2xl font-bold text-slate-600">Enter a profile to start planning</h4>
          <p className="text-slate-400 mt-2 max-w-sm mx-auto">The system will calculate exactly how many lectures you need to attend to stay eligible for exams.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Status Column */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Calculation Result Card */}
            <div className={`rounded-[32px] p-10 border-2 transition-all ${
              stats?.isSafe 
                ? 'bg-emerald-50/50 border-emerald-100' 
                : 'bg-rose-50/50 border-rose-100'
            }`}>
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="relative w-48 h-48 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="84" fill="transparent" stroke="#fff" strokeWidth="12" className="opacity-50" />
                    <circle 
                      cx="96" cy="96" r="84" fill="transparent" 
                      stroke={stats?.isSafe ? '#10b981' : '#f43f5e'} 
                      strokeWidth="12" 
                      strokeDasharray={527}
                      strokeDashoffset={527 - (527 * (stats?.currentPercentage || 0)) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out drop-shadow-md"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-slate-800">{stats?.currentPercentage}%</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Current</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center px-4 py-1 rounded-full bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm">
                    Status Protocol
                  </div>
                  <h4 className={`text-4xl font-black ${stats?.isSafe ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {stats?.isSafe ? 'Mission Eligible' : 'Ineligible for Exams'}
                  </h4>
                  
                  <div className="space-y-4 bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white">
                    {stats?.isSafe ? (
                      <div className="flex items-start space-x-3 text-emerald-800">
                        <TrendingUp className="shrink-0 mt-1" />
                        <p className="font-medium">
                          You are currently safe. You can skip up to <span className="font-black text-xl">{stats.canMissBeforeDanger}</span> more lectures and still maintain 75% eligibility.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-3 text-rose-800">
                        <AlertTriangle className="shrink-0 mt-1 animate-pulse" />
                        <p className="font-medium">
                          Critical Gap! You must attend the next <span className="font-black text-xl underline decoration-rose-300 decoration-4">{stats?.neededToReach75}</span> lectures consecutively to reach the 75% requirement.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Ledger */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <h5 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center">
                    <Calendar size={18} className="mr-2 text-indigo-500" />
                    Session Tally
                  </h5>
                  <div className="text-xs font-bold text-slate-400">Total Held: {totalDaysHeld} Days</div>
               </div>
               <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-50">
                    <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Classes Attended</p>
                    <p className="text-4xl font-black text-indigo-700">{stats?.attended}</p>
                  </div>
                  <div className="bg-rose-50/30 p-6 rounded-3xl border border-rose-50">
                    <p className="text-xs font-bold text-rose-400 uppercase mb-1">Classes Missed</p>
                    <p className="text-4xl font-black text-rose-700">{totalDaysHeld - (stats?.attended || 0)}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Target Surplus</p>
                    <p className="text-4xl font-black text-slate-400">{stats?.isSafe ? `+${stats.canMissBeforeDanger}` : `-${stats?.neededToReach75}`}</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Side Planner Column */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                <TrendingUp size={120} />
              </div>
              <h5 className="text-lg font-bold mb-6 flex items-center">
                <Target size={20} className="mr-2" />
                Semster Projection
              </h5>
              
              <div className="space-y-6 relative z-10">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-200 mb-3">Expected Total Lectures</label>
                  <input 
                    type="range" min="10" max="100" value={estimatedTotal} 
                    onChange={(e) => setEstimatedTotal(parseInt(e.target.value))}
                    className="w-full h-2 bg-indigo-400 rounded-lg appearance-none cursor-pointer accent-white" 
                  />
                  <div className="flex justify-between mt-2 text-xl font-black">
                    <span>{estimatedTotal}</span>
                    <span className="text-sm font-medium opacity-70">Goal: {Math.ceil(estimatedTotal * 0.75)} Presence</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-indigo-500/50 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="opacity-80">Remaining Lectures:</span>
                    <span className="font-bold">{Math.max(0, estimatedTotal - totalDaysHeld)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="opacity-80">Req. for Semester:</span>
                    <span className="font-bold">{Math.ceil(estimatedTotal * 0.75) - (stats?.attended || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Info size={18} />
                </div>
                <h5 className="font-bold">System Advice</h5>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed italic">
                "Attendance is calculated based on sessions held to date. {stats?.isSafe 
                  ? "Maintaining your current streak is highly recommended to stay in the green zone." 
                  : "Immediate attendance in all future sessions is required to restore your eligibility status."}"
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AttendanceInsight;
