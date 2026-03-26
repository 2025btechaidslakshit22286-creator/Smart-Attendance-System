
export type StudentStatus = 'IN' | 'OUT' | 'INCOMPLETE' | 'ABSENT';

export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  course: string;
  department?: string;
  registeredPhotos: string[]; // Base64 strings
  lastDetected?: number;
  registrationDate: number;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  entryTime: number;
  exitTime?: number;
  status: StudentStatus;
  date: string;
}

export type ViewState = 'DASHBOARD' | 'STUDENTS' | 'ATTENDANCE' | 'REGISTRATION' | 'SCANNER' | 'CALCULATOR';
