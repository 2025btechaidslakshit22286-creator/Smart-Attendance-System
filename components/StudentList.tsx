
import React, { useState } from 'react';
import { MoreVertical, Trash2, Edit2, Mail, Hash, AlertTriangle, X } from 'lucide-react';
import { Student } from '../types';

interface StudentListProps {
  students: Student[];
  onDelete: (id: string) => void;
}

const StudentList: React.FC<StudentListProps> = ({ students, onDelete }) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">Registered Students</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Student Info</th>
              <th className="px-6 py-4">Student ID</th>
              <th className="px-6 py-4">Department / Course</th>
              <th className="px-6 py-4">Reg. Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center">
                    <Hash size={48} className="mb-4 opacity-20" />
                    <p>No students registered yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                        {student.registeredPhotos[0] ? (
                          <img src={student.registeredPhotos[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                            {student.name[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{student.name}</p>
                        <div className="flex items-center text-xs text-slate-500 mt-0.5">
                          <Mail size={12} className="mr-1" />
                          <span>{student.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      {student.id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">{student.department || 'N/A'}</span>
                      <span className="text-xs text-slate-500">{student.course}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {student.registrationDate ? new Date(student.registrationDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 transition-opacity">
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(student.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Custom Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Confirm Deletion</h3>
              <p className="text-slate-500 mb-8">
                Are you sure you want to delete this student? This will also permanently remove all their attendance records. This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg shadow-rose-200"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;
