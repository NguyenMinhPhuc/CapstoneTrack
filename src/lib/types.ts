

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
  councilGraduationRubricId?: string; // Renamed from graduationRubricId
  councilInternshipRubricId?: string; // Renamed from internshipRubricId
  supervisorGraduationRubricId?: string; // New
  companyInternshipRubricId?: string;    // New
  graduationCouncilWeight?: number;
  internshipCouncilWeight?: number;
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

export type ReportStatus = 'reporting' | 'exempted' | 'withdrawn' | 'not_reporting';

export type DefenseRegistration = {
  id: string;
  sessionId: string;
  studentDocId: string; // The doc ID from the 'students' collection (which is the user's UID)
  studentId: string; // The official student ID number (e.g. 122001306)
  studentName: string;
  // Graduation Project fields
  projectTitle?: string;
  summary?: string;
  objectives?: string;
  expectedResults?: string;
  reportLink?: string;
  // General fields
  supervisorId?: string; // Graduation project supervisor
  supervisorName?: string; // Graduation project supervisor name
  internshipSupervisorId?: string; // Internship supervisor
  internshipSupervisorName?: string; // Internship supervisor name
  registrationDate: any;
  
  graduationStatus: ReportStatus;
  graduationStatusNote?: string;
  graduationExemptionDecisionNumber?: string;
  graduationExemptionDecisionDate?: any;
  graduationExemptionProofLink?: string;

  internshipStatus: ReportStatus;
  internshipStatusNote?: string;
  internshipExemptionDecisionNumber?: string;
  internshipExemptionDecisionDate?: any;
  internshipExemptionProofLink?: string;
  
  subCommitteeId?: string;
  // Internship fields
  internship_companyName?: string;
  internship_companyAddress?: string;
  internship_companySupervisorName?: string;
  internship_companySupervisorPhone?: string;
  internship_registrationFormLink?: string;
  internship_commitmentFormLink?: string;
  internship_acceptanceLetterLink?: string;
  internship_feedbackFormLink?: string;
  internship_reportLink?: string;
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
    description?: string;
    members: SubCommitteeMember[];
}

export type RubricCriterion = {
    id: string;
    name: string;
    description?: string;
    maxScore: number;
    PLO?: string;
    PI?: string;
    CLO?: string;
}

export type Rubric = {
    id: string;
    name: string;
    description?: string;
    criteria: RubricCriterion[];
}

export type Evaluation = {
    id: string;
    sessionId: string;
    registrationId: string;
    evaluatorId: string;
    rubricId: string;
    evaluationType: 'graduation' | 'internship';
    scores: {
        criterionId: string;
        score: number;
    }[];
    totalScore: number;
    comments?: string;
    evaluationDate: any;
}

export type SystemSettings = {
    id: string;
    enableOverallGrading?: boolean;
    allowStudentRegistration?: boolean;
}
