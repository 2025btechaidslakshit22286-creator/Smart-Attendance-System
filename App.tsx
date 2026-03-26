
import * as React from 'react';
import { useState, useEffect, useCallback, ErrorInfo, ReactNode, Component } from 'react';
import { 
  Users, 
  ClipboardList, 
  UserPlus, 
  ScanLine, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X,
  Search,
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Lock,
  ArrowRight,
  Cpu,
  Calculator
} from 'lucide-react';
import { Student, AttendanceRecord, ViewState, StudentStatus } from './types';
import DashboardHome from './components/DashboardHome';
import StudentList from './components/StudentList';
import AttendanceLogs from './components/AttendanceLogs';
import NewRegistration from './components/NewRegistration';
import CameraScanner from './components/CameraScanner';
import AttendanceCalculator from './components/AttendanceCalculator';
import { db, auth } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDoc,
  setDoc,
  getDocs,
  deleteField,
  getDocFromServer
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const BREAK_LIMIT_MS = 10 * 60 * 1000; // 10 Minutes in MS

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends (Component as any) {
  public state: any = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): any {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render(): React.ReactNode {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(error?.message || "");
        if (parsed.error) errorMessage = `Database Error: ${parsed.error}`;
      } catch (e) {
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
          <div className="bg-slate-800 border border-red-500/30 p-8 rounded-3xl max-w-md w-full text-center">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h2 className="text-xl font-bold text-white mb-2">System Error</h2>
            <p className="text-slate-400 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-bold transition-all"
            >
              Reload System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isProcessingAbsent, setIsProcessingAbsent] = useState<Set<string>>(new Set());
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const studentsUnsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Student));
      setStudents(studentsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
    });

    const attendanceUnsubscribe = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const attendanceData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AttendanceRecord));
      setAttendance(attendanceData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    });

    return () => {
      studentsUnsubscribe();
      attendanceUnsubscribe();
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const today = new Date().toLocaleDateString();
      const currentHour = new Date().getHours();
      
      // 2. Break limit check (Auto-Incomplete)
      attendance.forEach(async (record) => {
        if (record.status === 'OUT' && record.exitTime) {
          const timeSinceExit = now - record.exitTime;
          if (timeSinceExit > BREAK_LIMIT_MS) {
            try {
              await updateDoc(doc(db, 'attendance', record.id), { status: 'INCOMPLETE' });
            } catch (error) {
              handleFirestoreError(error, OperationType.UPDATE, `attendance/${record.id}`);
            }
          }
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isLoggedIn, attendance, students]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful");
      
      // Bootstrap admin document if matches
      if (userCredential.user.email === "lakshitpareek05@gmail.com") {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          role: 'admin',
          updatedAt: Date.now()
        }, { merge: true });
      }
    } catch (error: any) {
      console.error("Login error:", error.code, error.message);
      if (error.code === 'auth/operation-not-allowed') {
        setLoginError("Email login is still disabled in Firebase. Please double-check that you enabled 'Email/Password' in the 'Sign-in method' tab and clicked 'Save'.");
      } else if (error.code === 'auth/user-not-found') {
        setLoginError("No user found with this email. Please make sure you added the user in the 'Users' tab of Firebase Authentication.");
      } else if (error.code === 'auth/wrong-password') {
        setLoginError("Incorrect password. Please check your spelling.");
      } else if (error.code === 'auth/invalid-email') {
        setLoginError("The email address is not valid.");
      } else {
        setLoginError(`${error.message} (Code: ${error.code})`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError(null);
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      
      // Bootstrap admin document if matches
      if (userCredential.user.email === "lakshitpareek05@gmail.com") {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          role: 'admin',
          updatedAt: Date.now()
        }, { merge: true });
      }
    } catch (error: any) {
      setLoginError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('DASHBOARD');
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const toggleStatus = async (studentId: string, forcedStatus?: StudentStatus) => {
    const today = new Date().toLocaleDateString();
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Find ALL records for today to clean up duplicates if any
    const todayRecords = attendance.filter(r => r.studentId === studentId && r.date === today);
    const existingRecord = todayRecords[0];
    
    // Prevent accidental double-toggles within 5 seconds (reduced from 60s for better responsiveness)
    if (existingRecord && (Date.now() - existingRecord.entryTime < 5000)) {
      console.log(`Skipping toggle for ${student.name} - too soon since last action.`);
      return;
    }
    
    try {
      if (existingRecord) {
        let updates: any = {};
        
        // If they were marked ABSENT or INCOMPLETE, treat this as a fresh entry
        if (existingRecord.status === 'ABSENT' || existingRecord.status === 'INCOMPLETE') {
          updates = { 
            status: forcedStatus || 'IN', 
            entryTime: Date.now(), 
            exitTime: forcedStatus === 'OUT' ? Date.now() : deleteField() 
          };
        } else if (forcedStatus) {
            if (forcedStatus === 'IN' && existingRecord.status === 'OUT') {
                updates = { status: 'IN', exitTime: deleteField() };
            } else if (forcedStatus === 'OUT' && existingRecord.status === 'IN') {
                updates = { status: 'OUT', exitTime: Date.now() };
            }
        } else {
          if (existingRecord.status === 'IN') {
            updates = { status: 'OUT', exitTime: Date.now() };
          } else if (existingRecord.status === 'OUT') {
            updates = { status: 'IN', exitTime: deleteField() };
          }
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'attendance', existingRecord.id), updates);
        }

        // Clean up any other records for the same student today (duplicates)
        if (todayRecords.length > 1) {
          const duplicates = todayRecords.slice(1);
          for (const dup of duplicates) {
            await deleteDoc(doc(db, 'attendance', dup.id));
          }
        }
      } else {
        const initialStatus = forcedStatus === 'OUT' ? 'OUT' : 'IN';
        const newRecord: any = {
          studentId: student.id,
          studentName: student.name,
          entryTime: Date.now(),
          status: initialStatus,
          date: today
        };
        
        if (initialStatus === 'OUT') {
          newRecord.exitTime = Date.now();
        }

        await addDoc(collection(db, 'attendance'), newRecord);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    }
  };

  const registerStudent = async (studentData: Omit<Student, 'id'>) => {
    try {
      await addDoc(collection(db, 'students'), studentData);
      setCurrentView('STUDENTS');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'students');
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      // 1. Delete the student document
      await deleteDoc(doc(db, 'students', id));
      
      // 2. Delete all attendance records for this student
      const attendanceQuery = query(collection(db, 'attendance'), where('studentId', '==', id));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      const deletePromises = attendanceSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      setNotification({ message: "Student and attendance records deleted successfully.", type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Delete error:", error);
      setNotification({ message: "Failed to delete student. Check permissions.", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const markAllAbsent = async () => {
    const today = new Date().toLocaleDateString();
    const now = Date.now();
    const scannedTodayIds = new Set(attendance.filter(r => r.date === today).map(r => r.studentId));
    const pendingStudents = students.filter(s => !scannedTodayIds.has(s.id));

    if (pendingStudents.length === 0) return;

    try {
      const promises = pendingStudents.map(student => 
        addDoc(collection(db, 'attendance'), {
          studentId: student.id,
          studentName: student.name,
          entryTime: now,
          status: 'ABSENT',
          date: today
        })
      );
      await Promise.all(promises);
      setNotification({ message: `Marked ${pendingStudents.length} students as absent.`, type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Error marking absent", error);
      setNotification({ message: "Failed to mark students as absent.", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#020617] relative flex items-center justify-center p-4 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Digital Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative w-full max-w-[480px]">
          {/* Main Glass Card */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            {/* Header / Identity Visual */}
            <div className="p-10 pb-6 text-center">
               <div className="relative mx-auto w-24 h-24 mb-6">
                  <div className="absolute inset-0 border-2 border-blue-500/30 rounded-2xl"></div>
                  <div className="absolute inset-0 border-2 border-blue-500 rounded-2xl animate-[ping_3s_ease-in-out_infinite] opacity-20"></div>
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-[scan_2s_linear_infinite]"></div>
                  <div className="w-full h-full flex items-center justify-center text-blue-400">
                    <ShieldCheck size={40} className="drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  </div>
               </div>
               <h2 className="text-xl font-bold text-white mb-1">Secure Authentication</h2>
               <p className="text-slate-400 text-sm">Initialize system node for verification</p>
            </div>

            <form onSubmit={handleLogin} className="p-10 pt-4 space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Users className="text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                  </div>
                  <input 
                    type="email" 
                    name="email"
                    className="block w-full bg-slate-900/50 border border-slate-800 text-white pl-11 pr-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
                    placeholder="Principal ID"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                  </div>
                  <input 
                    type="password" 
                    name="password"
                    className="block w-full bg-slate-900/50 border border-slate-800 text-white pl-11 pr-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
                    placeholder="Security Key"
                  />
                </div>
              </div>

              {loginError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle size={14} />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500/50" defaultChecked />
                  <span className="text-xs text-slate-400 font-medium">Keep session alive</span>
                </label>
                <a href="#" className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-all">Forgot Key?</a>
              </div>

              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="relative w-full group overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <div className="relative flex items-center justify-center space-x-2">
                  {isLoggingIn ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Initialize Connection</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#020617] px-2 text-slate-500">Or continue with</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 rounded-2xl transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                <img 
                  src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" 
                  className="w-5 h-5" 
                  alt="Google" 
                  referrerPolicy="no-referrer"
                />
                <span>Sign in with Google</span>
              </button>
            </form>

            <div className="bg-white/5 border-t border-white/5 p-6 text-center">
              <p className="text-xs text-slate-500">
                Authorized access only. All IP activities are logged for safety.
              </p>
            </div>
          </div>
          
          {/* Footer Badge */}
          <div className="mt-8 flex justify-center space-x-6">
            <div className="flex items-center space-x-2 text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
              <span className="text-[10px] uppercase tracking-widest font-bold">Mainnet Online</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span className="text-[10px] uppercase tracking-widest font-bold">Node: SG-Alpha</span>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes scan {
            0%, 100% { top: 0%; opacity: 0; }
            5%, 95% { opacity: 1; }
            50% { top: 100%; }
          }
        `}</style>
      </div>
    );
  }

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
        currentView === view ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className={`bg-white border-r border-slate-200 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ScanLine className="text-white" size={24} />
          </div>
          {isSidebarOpen && <span className="font-bold text-slate-800 text-lg">SmartFace AI</span>}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Overview" />
          <NavItem view="STUDENTS" icon={Users} label="Students" />
          <NavItem view="REGISTRATION" icon={UserPlus} label="Register Student" />
          <NavItem view="SCANNER" icon={ScanLine} label="Face Scanner" />
          <NavItem view="CALCULATOR" icon={Calculator} label="Attendance Calculator" />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all">
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500">
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-semibold text-slate-800">
              {currentView === 'DASHBOARD' && 'Dashboard Overview'}
              {currentView === 'STUDENTS' && 'Student Management'}
              {currentView === 'REGISTRATION' && 'New Registration'}
              {currentView === 'SCANNER' && 'Live Recognition'}
              {currentView === 'CALCULATOR' && 'Attendance Calculator'}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">A</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 relative">
          {notification && (
            <div className={`fixed top-20 right-8 z-50 p-4 rounded-xl shadow-lg border animate-in slide-in-from-right duration-300 ${
              notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <div className="flex items-center space-x-2">
                {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span className="font-medium">{notification.message}</span>
              </div>
            </div>
          )}
          {currentView === 'DASHBOARD' && <DashboardHome students={students} attendance={attendance} onSwitchView={setCurrentView} onMarkAllAbsent={markAllAbsent} />}
          {currentView === 'STUDENTS' && <StudentList students={students} onDelete={deleteStudent} />}
          {currentView === 'REGISTRATION' && <NewRegistration onRegister={registerStudent} />}
          {currentView === 'SCANNER' && <CameraScanner students={students} onDetected={toggleStatus} />}
          {currentView === 'CALCULATOR' && <AttendanceCalculator />}
        </div>
      </main>
    </div>
  );
}
