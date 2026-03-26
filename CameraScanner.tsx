
import React, { useState, useRef, useEffect } from 'react';
import { Camera, ScanLine, RefreshCw, UserPlus, Coffee, CheckCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import { Student, StudentStatus } from '../types';
import { GeminiFaceRecognition } from '../services/geminiService';

interface CameraScannerProps {
  students: Student[];
  onDetected: (id: string, forcedStatus?: StudentStatus) => void;
}

type ScannerMode = 'ENTRY' | 'BREAK';
type ScanResult = 'IDLE' | 'SUCCESS' | 'ERROR';
type FacingMode = 'user' | 'environment';

const CameraScanner: React.FC<CameraScannerProps> = ({ students, onDetected }) => {
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>('IDLE');
  const [mode, setMode] = useState<ScannerMode>('ENTRY');
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [scanInterval, setScanInterval] = useState(3000);
  const [lastFound, setLastFound] = useState<{name: string, time: number, type: ScannerMode} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ai] = useState(() => new GeminiFaceRecognition());

  // Auto-Scanner Loop
  useEffect(() => {
    let timeout: any;
    
    // Only schedule next scan if active, not currently processing, and state is IDLE
    if (isActive && !isProcessing && scanResult === 'IDLE') {
      timeout = setTimeout(() => {
        if (videoRef.current) {
          captureAndScan();
        }
      }, scanInterval); 
    }

    return () => clearTimeout(timeout);
  }, [isActive, isProcessing, scanResult, mode, scanInterval]);

  const toggleCamera = async () => {
    if (isActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setIsActive(false);
    setScanResult('IDLE');
    setIsProcessing(false);
  };

  const startCamera = async (currentFacingMode: FacingMode = facingMode) => {
    try {
      // Stop existing tracks first
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: {
          facingMode: currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsActive(true);
      setScanResult('IDLE');
    } catch (err) {
      console.error("Camera access error:", err);
      // Fallback for older browsers or specific mobile issues
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
        setIsActive(true);
        setScanResult('IDLE');
      } catch (fallbackErr) {
        setError("Could not access camera. Please ensure you have granted permissions.");
      }
    }
  };

  const switchFacingMode = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (isActive) {
      startCamera(newMode);
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || isProcessing || scanResult !== 'IDLE') return;
    
    // Ensure video is playing and has dimensions
    if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) {
      return;
    }

    const activeModeAtCapture = mode;
    setIsProcessing(true);

    try {
      const canvas = document.createElement('canvas');
      // Increase capture resolution for better mobile recognition (1024px width)
      const targetWidth = 1024;
      const scale = Math.min(1, targetWidth / videoRef.current.videoWidth);
      canvas.width = videoRef.current.videoWidth * scale;
      canvas.height = videoRef.current.videoHeight * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx && videoRef.current) {
        // Ensure high quality drawing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      }
      
      // Use higher quality for the JPEG to preserve facial details
      const base64 = canvas.toDataURL('image/jpeg', 0.9);

      const matchedIds = await ai.identifyStudents(base64, students);
      
      if (matchedIds.length > 0) {
        const detectedStudents = matchedIds
          .map(id => students.find(s => s.id === id))
          .filter((s): s is Student => !!s);

        if (detectedStudents.length > 0) {
          // Process all detected students sequentially to avoid race conditions
          for (const student of detectedStudents) {
            await onDetected(student.id, activeModeAtCapture === 'ENTRY' ? 'IN' : 'OUT');
          }
          
          const names = detectedStudents.map(s => s.name).join(', ');
          setScanResult('SUCCESS');
          setLastFound({ 
            name: names, 
            time: Date.now(), 
            type: activeModeAtCapture 
          });
          
          // Cooldown period before resuming scanning
          setTimeout(() => {
            setLastFound(null);
            setScanResult('IDLE');
            setIsProcessing(false);
          }, 3000); // 3 second cooldown to allow person to move away
        } else {
          setScanResult('IDLE');
          setIsProcessing(false);
        }
      } else {
        // No match - immediately ready for next cycle
        setScanResult('IDLE');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Scan cycle failed:", error);
      setScanResult('ERROR');
      setTimeout(() => {
        setScanResult('IDLE');
        setIsProcessing(false);
      }, 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => {
            setMode('ENTRY');
            setScanResult('IDLE'); // Reset to ensure loop continues
            setIsProcessing(false);
          }}
          className={`flex items-center justify-center space-x-3 p-6 rounded-2xl border-2 transition-all shadow-sm ${
            mode === 'ENTRY' 
            ? 'bg-blue-600 border-blue-600 text-white scale-[1.02]' 
            : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <UserPlus size={24} />
          <span className="font-bold text-lg">Entry / Return</span>
        </button>
        <button 
          onClick={() => {
            setMode('BREAK');
            setScanResult('IDLE'); // Reset to ensure loop continues
            setIsProcessing(false);
          }}
          className={`flex items-center justify-center space-x-3 p-6 rounded-2xl border-2 transition-all shadow-sm ${
            mode === 'BREAK' 
            ? 'bg-amber-500 border-amber-500 text-white scale-[1.02]' 
            : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Coffee size={24} />
          <span className="font-bold text-lg">Break</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden">
        {/* Terminal Header */}
        <div className="bg-slate-900 px-8 py-6 flex items-center justify-between text-white">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                scanResult === 'SUCCESS' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 
                scanResult === 'ERROR' ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 
                (isActive ? (mode === 'ENTRY' ? 'bg-blue-500 animate-pulse' : 'bg-amber-500 animate-pulse') : 'bg-slate-600')
              }`}></div>
              <span className="font-mono text-sm tracking-widest uppercase">
                  {scanResult === 'IDLE' ? (isActive ? `${mode} ACTIVE` : 'SENSOR OFFLINE') : `${scanResult} LOCKED`}
              </span>
            </div>

            {/* Scan Interval Control */}
            <div className="hidden md:flex items-center space-x-3 bg-slate-800 px-4 py-2 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Delay</span>
              <input 
                type="range" 
                min="100" 
                max="2000" 
                step="100"
                value={scanInterval}
                onChange={(e) => setScanInterval(parseInt(e.target.value))}
                className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-[10px] font-mono text-blue-400 w-12">{scanInterval}ms</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isActive && (
              <button 
                onClick={switchFacingMode}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                title="Switch Camera"
              >
                <RefreshCw size={16} />
              </button>
            )}
            <button 
              onClick={toggleCamera}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors ${
                isActive ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
              }`}
            >
              {isActive ? <RefreshCw size={14} className="animate-spin-slow" /> : <Camera size={14} />}
              <span>{isActive ? 'Stop Scanner' : 'Start Scanner'}</span>
            </button>
          </div>
        </div>

        {/* Live Viewport */}
        <div className="relative aspect-video bg-slate-800 overflow-hidden">
          {error && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-sm">
              <div className="bg-white p-8 rounded-3xl max-w-sm text-center space-y-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Camera Error</h3>
                <p className="text-slate-600 text-sm">{error}</p>
                <button 
                  onClick={() => {
                    setError(null);
                    startCamera();
                  }}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
          {!isActive && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 space-y-4">
              <ScanLine size={64} className="opacity-20" />
              <p className="font-medium">Optical Sensor Offline</p>
            </div>
          )}
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'} ${facingMode === 'user' ? '-scale-x-100' : ''}`} 
          />
          
          {isActive && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Target Reticle */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-2 rounded-3xl transition-all duration-300 ${
                scanResult === 'SUCCESS' ? 'border-emerald-500 scale-105 shadow-[0_0_40px_rgba(16,185,129,0.5)]' : 
                scanResult === 'ERROR' ? 'border-rose-500 scale-95' : 
                (isProcessing ? 'border-white scale-[1.01]' : 'border-white/20')
              }`}>
                {/* Corners */}
                <div className={`absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-xl transition-colors ${
                  scanResult === 'SUCCESS' ? 'border-emerald-500' : scanResult === 'ERROR' ? 'border-rose-500' : 'border-white/40'
                }`}></div>
                <div className={`absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-xl transition-colors ${
                  scanResult === 'SUCCESS' ? 'border-emerald-500' : scanResult === 'ERROR' ? 'border-rose-500' : 'border-white/40'
                }`}></div>
                <div className={`absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-xl transition-colors ${
                  scanResult === 'SUCCESS' ? 'border-emerald-500' : scanResult === 'ERROR' ? 'border-rose-500' : 'border-white/40'
                }`}></div>
                <div className={`absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-xl transition-colors ${
                  scanResult === 'SUCCESS' ? 'border-emerald-500' : scanResult === 'ERROR' ? 'border-rose-500' : 'border-white/40'
                }`}></div>
              </div>
              
              {/* Scan Beam Effect */}
              {isProcessing && (
                <div className={`absolute top-0 left-0 w-full h-2 shadow-[0_0_20px] animate-[scan_1s_linear_infinite] ${
                  mode === 'ENTRY' ? 'bg-blue-400 shadow-blue-400' : 'bg-amber-400 shadow-amber-400'
                }`}></div>
              )}
            </div>
          )}

          {/* Success Banner */}
          {lastFound && (
            <div className="absolute top-0 inset-x-0 flex justify-center p-6 pointer-events-none">
              <div className="px-6 py-4 rounded-2xl flex items-center space-x-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-top duration-300 bg-emerald-600 text-white border border-white/20">
                <div className="bg-white/20 p-2 rounded-lg">
                  <CheckCircle size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-sm uppercase tracking-wider">{lastFound.type === 'ENTRY' ? 'ENTRY LOGGED' : 'BREAK LOGGED'}</span>
                  <span className="text-lg font-bold leading-tight">{lastFound.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Status Bar */}
          <div className="absolute bottom-4 inset-x-4 flex items-center justify-between px-4 py-3 bg-black/70 backdrop-blur-xl rounded-2xl text-[10px] text-white font-mono border border-white/10">
            <div className="flex items-center space-x-6">
              <span className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span className="uppercase tracking-widest">{isProcessing ? 'Analyzing Frame...' : 'Active Pulse'}</span>
              </span>
              <span className="hidden sm:inline opacity-40">AI NODE: GEMINI-3-FLASH</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="opacity-40">{new Date().toLocaleDateString()}</span>
              <span className="font-bold text-blue-400">{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-start space-x-4">
        <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100">
          <ShieldCheck size={20} />
        </div>
        <div className="text-sm text-slate-700 leading-relaxed">
          <p className="font-bold text-slate-900 mb-1">Scanner Optimization Tip:</p>
          <p className="text-slate-600">The scanner is currently in {scanInterval < 500 ? 'ultra-fast' : scanInterval < 1000 ? 'high-speed' : 'balanced'} mode ({scanInterval}ms intervals). Switching between Entry and Break mode will briefly interrupt the loop to prevent double logs.</p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-in {
          animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slide-in {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CameraScanner;
