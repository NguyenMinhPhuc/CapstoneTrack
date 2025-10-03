export type Application = {
  id: string;
  studentName: string;
  studentId: string;
  avatar: string;
  projectTitle: string;
  supervisor?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submissionDate: string;
  type: 'Internship' | 'Graduation';
};

export type StudentProgress = {
  stage: string;
  count: number;
};

export type SystemUser = {
  id: string;
  email: string;
  role: 'admin' | 'supervisor' | 'student';
  status: 'active' | 'pending' | 'disabled';
  createdAt: any; 
};

export type GraduationDefenseSession = {
  id: string;
  name: string;
  startDate: any;
  expectedReportDate: any;
  description?: string;
  createdAt: any;
}
