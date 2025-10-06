

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
  registrationDeadline: any;
  description?: string;
  zaloGroupLink?: string;
  createdAt: any;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export type Student = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    // Add other student-specific fields as needed
}

export type DefenseRegistration = {
  id: string;
  studentId: string;
  studentName: string;
  projectTitle?: string;
  supervisorName?: string;
  registrationDate: any;
}
