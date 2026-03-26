
import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserMinus, Clock, Timer, Coffee } from 'lucide-react';
import { AttendanceRecord, ViewState, Student } from '../types';

interface DashboardHomeProps {
  students: Student[];
  attendance: AttendanceRecord[];
  onSwitchView: (view: ViewState) => void;
  onMarkAllAbsent: () => void;
}

const BREAK_LIMIT_MS = 10 * 60 * 1000;

// Sub-component for individual break timer to handle its own tick
const BreakTimer: React.FC<{ exitTime: number }> = ({ exitTime }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTime = () => {
      const elapsed = Date.now() - exitTime;
      const remaining = Math.max(0, BREAK_LIMIT_MS - elapsed);
      setTimeLeft(remaining);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [exitTime]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const percentage = (timeLeft / BREAK_LIMIT_MS) * 100;

  const isUrgent = timeLeft < 60000; // Less than 1 minute

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs font-mono">
        <span className={`font-bold ${isUrgent ? 'text-rose-500 animate-pulse' : 'text-amber-600'}`}>
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
        <span className="text-slate-400">{timeLeft > 0 ? 'REM OVER 10M' : 'LIMIT EXCEEDED'}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${isUrgent ? 'bg-rose-500' : 'bg-amber-400'}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

const DashboardHome: React.FC<DashboardHomeProps> = ({ students, attendance, onSwitchView, onMarkAllAbsent }) => {
  const today = new Date().toLocaleDateString();
  const studentIds = new Set(students.map(s => s.id));
  
  // Filter attendance to only include records for existing students
  const validAttendance = attendance.filter(r => studentIds.has(r.studentId));
  const todaysAttendance = validAttendance.filter(r => r.date === today);
  
  // Get the latest status for each student to prevent double counting
  const latestStatusByStudent = new Map<string, string>();
  todaysAttendance.forEach(record => {
    // Since records are usually appended, the last one in the list for a student is likely the latest
    // Or we could sort by entryTime if needed, but for now we'll assume the last one wins
    latestStatusByStudent.set(record.studentId, record.status);
  });

  const present = Array.from(latestStatusByStudent.values()).filter(status => status === 'IN').length;
  const onBreak = Array.from(latestStatusByStudent.values()).filter(status => status === 'OUT').length;
  
  // Students who have scanned at all today
  const scannedTodayIds = new Set(latestStatusByStudent.keys());
  
  // Incomplete = (Students who haven't scanned at all) + (Students with INCOMPLETE or ABSENT status)
  const notScannedCount = students.length - scannedTodayIds.size;
  const exceededBreakCount = Array.from(latestStatusByStudent.values()).filter(status => status === 'INCOMPLETE' || status === 'ABSENT').length;
  const incomplete = notScannedCount + exceededBreakCount;

  const activeBreaks = todaysAttendance.filter(r => r.status === 'OUT' && r.exitTime);
  const notScannedStudents = students.filter(s => !scannedTodayIds.has(s.id));

  const stats = [
    { label: 'Total Students', value: students.length, icon: Users, color: 'blue', view: 'STUDENTS' as ViewState },
    { label: 'Present Now', value: present, icon: UserCheck, color: 'emerald', view: 'DASHBOARD' as ViewState },
    { label: 'On Break', value: onBreak, icon: Clock, color: 'amber', view: 'DASHBOARD' as ViewState },
    { label: 'Incomplete', value: incomplete, icon: UserMinus, color: 'rose', view: 'DASHBOARD' as ViewState },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div 
            key={i}
            onClick={() => stat.view !== 'DASHBOARD' && onSwitchView(stat.view)}
            className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group text-left ${stat.view !== 'DASHBOARD' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
          >
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">{stat.label}</p>
              <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
            </div>
            <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 ${stat.view !== 'DASHBOARD' ? 'group-hover:scale-110 transition-transform' : ''}`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col space-y-8">
        {/* Recent Activity - Now Full Width */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2">
              <Users size={18} className="text-blue-600" />
              <span>Live Attendance Stream</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todaysAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400">No activity today yet. Start scanning to see logs.</td>
                  </tr>
                ) : (
                  todaysAttendance.slice(-5).reverse().map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">{record.studentName}</p>
                        <p className="text-xs text-slate-500">ID: {record.studentId}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(record.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'IN' ? 'bg-emerald-50 text-emerald-600' :
                          record.status === 'OUT' ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Breaks Section - Now Full Width */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2">
              <Timer size={18} className="text-amber-600" />
              <span>Active Break Monitoring (10m Limit)</span>
            </h3>
            <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-md font-bold">
              {activeBreaks.length} ACTIVE
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeBreaks.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 flex flex-col items-center">
                <Coffee size={40} className="mb-3 opacity-20" />
                <p className="text-sm">No students are currently on break.</p>
              </div>
            ) : (
              activeBreaks.map(record => (
                <div key={record.id} className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800">{record.studentName}</p>
                    <p className="text-[10px] text-slate-400 font-mono tracking-tighter">ID: {record.studentId}</p>
                  </div>
                  <BreakTimer exitTime={record.exitTime!} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Attendance Section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2">
              <UserMinus size={18} className="text-rose-600" />
              <span>Pending Attendance (Not Scanned Today)</span>
            </h3>
            <div className="flex items-center space-x-3">
              {notScannedStudents.length > 0 && (
                <button 
                  onClick={onMarkAllAbsent}
                  className="text-[10px] bg-rose-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-rose-500 transition-colors shadow-sm"
                >
                  MARK ALL ABSENT
                </button>
              )}
              <span className="text-xs bg-rose-50 text-rose-600 px-2 py-1 rounded-md font-bold">
                {notScannedStudents.length} PENDING
              </span>
            </div>
          </div>
          <div className="p-6">
            {notScannedStudents.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <p className="text-sm">All registered students have scanned today! 🎉</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {notScannedStudents.map(student => (
                  <div key={student.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-800 truncate">{student.name}</p>
                    <p className="text-xs text-slate-500 truncate">{student.course}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-2">ID: {student.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
