
import React, { useState, useRef } from 'react';
import { Camera, User, Mail, GraduationCap, X, CheckCircle2, Phone, Building2 } from 'lucide-react';
import { Student } from '../types';

interface NewRegistrationProps {
  onRegister: (student: Omit<Student, 'id'>) => void;
}

const NewRegistration: React.FC<NewRegistrationProps> = ({ onRegister }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '',
    course: '',
    department: ''
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && photos.length < 5) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const data = canvas.toDataURL('image/jpeg');
      setPhotos(prev => [...prev, data]);
      
      if (photos.length + 1 >= 5) {
        stopCamera();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length < 5) {
      setError("Please capture at least 5 photos for face encoding.");
      return;
    }
    
    const newStudent: Omit<Student, 'id'> = {
      ...formData,
      registeredPhotos: photos,
      registrationDate: Date.now()
    };
    onRegister(newStudent);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-3 text-rose-700">
            <X className="bg-rose-100 p-1 rounded-full" size={20} />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
            <X size={18} />
          </button>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left: Info */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800">Student Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Department</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="text" 
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Engineering"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Course / Batch</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="text" 
                    value={formData.course}
                    onChange={e => setFormData({...formData, course: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Computer Science - B1"
                  />
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button 
                type="submit"
                disabled={photos.length < 5}
                className="w-full bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
              >
                Register & Save Profile
              </button>
            </div>
          </div>

          {/* Right: Camera */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800">Face Encoding (5 Photos)</h3>
            
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-video border-2 border-dashed border-slate-300 flex flex-col items-center justify-center">
              {isCapturing ? (
                <>
                  <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
                  <div className="absolute inset-x-0 bottom-4 flex justify-center">
                    <button 
                      type="button"
                      onClick={capturePhoto}
                      className="bg-white/90 backdrop-blur-md p-4 rounded-full shadow-lg hover:scale-105 transition-transform"
                    >
                      <Camera className="text-blue-600" size={32} />
                    </button>
                  </div>
                </>
              ) : (
                <button 
                  type="button"
                  onClick={startCamera}
                  disabled={photos.length >= 5}
                  className="flex flex-col items-center text-slate-400 hover:text-blue-500 transition-colors"
                >
                  <Camera size={48} className="mb-2" />
                  <span className="font-semibold">{photos.length >= 5 ? 'All Captures Done' : 'Start Camera'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-slate-50 border border-slate-200 overflow-hidden relative">
                  {photos[i] ? (
                    <img src={photos[i]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-bold">
                      {i + 1}
                    </div>
                  )}
                  {photos[i] && (
                    <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5">
                      <CheckCircle2 size={10} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 text-center">
              Capture 5 different angles of the face for better recognition accuracy.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewRegistration;
