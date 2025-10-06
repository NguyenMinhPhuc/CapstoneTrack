

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
    id: string; // This is the Firebase Auth UID
    userId: string; // This is also the Firebase Auth UID, for relation
    studentId: string; // This is the official Student ID (e.g., 122001306)
    firstName: string;
    lastName: string;
    email: string;
    major?: string;
    enrollmentYear?: number;
    className?: string; // Add className field
    phone?: string;
    CCCD?: string;
    createdAt: any;
    status: 'studying' | 'reserved' | 'dropped_out' | 'graduated';
}

export type Supervisor = {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    facultyRank?: string;
    createdAt: any;
}

export type DefenseRegistration = {
  id: string;
  sessionId: string;
  studentDocId: string; // The doc ID from the 'students' collection (which is the user's UID)
  studentId: string; // The official student ID number (e.g. 122001306)
  studentName: string;
  projectTitle?: string;
  supervisorName?: string;
  registrationDate: any;
  registrationStatus: 'reporting' | 'exempted' | 'withdrawn';
  statusNote?: string;
  exemptionDecisionNumber?: string;
  exemptionDecisionDate?: any;
  exemptionProofLink?: string;
  subCommitteeId?: string;
}

// Represents a student's registration for a specific graduation defense session.
export type DefenseSessionRegistration = {
  id: string;
  sessionId: string;
  studentId: string; // docId of the student
  studentName: string;
  studentIdentifier: string; // official student ID number
  registrationDate: any;
}


// Combined type for the student registration table
export type StudentWithRegistrationDetails = DefenseRegistration & {
  status: Student['status'];
  className?: string; // Add className
};

export type DefenseCouncilMember = {
    id: string;
    sessionId: string;
    supervisorId: string;
    name: string;
    role: 'President' | 'Vice President' | 'Secretary' | 'Member';
}

export type SubCommitteeMember = {
    supervisorId: string;
    name: string;
    role: 'Head' | 'Secretary' | 'Commissioner';
}

export type DefenseSubCommittee = {
    id: string;
    sessionId: string;
    name: string;
    members: SubCommitteeMember[];
}

    
