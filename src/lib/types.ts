export type Application = {
  id: string;
  studentName: string;
  studentId: string;
  avatar: string;
  projectTitle: string;
  supervisor?: string;
  status: "Pending" | "Approved" | "Rejected";
  submissionDate: string;
  type: "Internship" | "Graduation";
};

export type StudentProgress = {
  stage: string;
  count: number;
};

export type SystemUser = {
  id: string;
  email: string;
  displayName?: string;
  role: "admin" | "supervisor" | "student";
  status: "active" | "pending" | "disabled";
  passwordInitialized?: boolean;
  createdAt: any;
};

export type DefenseSession = {
  id: string;
  name: string;
  sessionType: "graduation" | "internship" | "combined";
  startDate: any;
  expectedReportDate: any;
  registrationDeadline: any;
  description?: string;
  zaloGroupLink?: string;
  postDefenseSubmissionLink?: string;
  postDefenseSubmissionDescription?: string;
  createdAt: any;
  status: "upcoming" | "ongoing" | "completed";
  companyIds?: string[];
  councilGraduationRubricId?: string;
  councilInternshipRubricId?: string;
  supervisorGraduationRubricId?: string;
  companyInternshipRubricId?: string;
  graduationCouncilWeight?: number;
  internshipCouncilWeight?: number;
};

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
  status: "studying" | "reserved" | "dropped_out" | "graduated";
  graduationStatus: "achieved" | "not_achieved";
  internshipStatus: "achieved" | "not_achieved";
};

export type ReportStatus =
  | "reporting"
  | "exempted"
  | "not_yet_reporting"
  | "not_reporting"
  | "completed";
export type ProjectRegistrationStatus = "pending" | "approved" | "rejected";
export type ProposalStatus =
  | "not_submitted"
  | "pending_approval"
  | "approved"
  | "rejected";
export type FinalReportStatus =
  | "not_submitted"
  | "pending_approval"
  | "approved"
  | "rejected";
export type InternshipRegistrationStatus = "pending" | "approved" | "rejected";

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
  implementationPlan?: string;
  reportLink?: string;
  postDefenseReportLink?: string;
  projectRegistrationStatus?: ProjectRegistrationStatus;
  proposalStatus?: ProposalStatus;
  proposalLink?: string;
  reportStatus?: FinalReportStatus;
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
  internshipRegistrationStatus?: InternshipRegistrationStatus;
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
  internship_positionId?: string;
  internship_positionTitle?: string;
};

// Represents a student's registration for a specific graduation defense session.
export type DefenseSessionRegistration = {
  id: string;
  sessionId: string;
  studentId: string; // docId of the student
  studentName: string;
  studentIdentifier: string; // official student ID number
  registrationDate: any;
};

// Combined type for the student registration table
export type StudentWithRegistrationDetails = DefenseRegistration & {
  status: Student["status"];
  className?: string;
  statusNote?: string;
  exemptionDecisionNumber?: string;
  exemptionDecisionDate?: any;
  exemptionProofLink?: string;
};

export type SubmissionReport = DefenseRegistration & {
  sessionName: string;
};

export type DefenseCouncilMember = {
  id: string;
  sessionId: string;
  supervisorId: string;
  name: string;
  role: "President" | "Vice President" | "Secretary" | "Member";
};

export type SubCommitteeMember = {
  supervisorId: string;
  name: string;
  role: "Head" | "Secretary" | "Commissioner";
};

export type DefenseSubCommittee = {
  id: string;
  sessionId: string;
  name: string;
  description?: string;
  members: SubCommitteeMember[];
};

export type RubricCriterion = {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  PLO?: string;
  PI?: string;
  CLO?: string;
};

export type Rubric = {
  id: string;
  name: string;
  description?: string;
  criteria: RubricCriterion[];
};

export type Evaluation = {
  id: string;
  sessionId: string;
  registrationId: string;
  evaluatorId: string;
  rubricId: string;
  evaluationType: "graduation" | "internship";
  attendance?: "present" | "absent";
  scores: {
    criterionId: string;
    score: number;
  }[];
  totalScore: number;
  comments?: string;
  evaluationDate: any;
};

export type SystemSettings = {
  id: string;
  enableOverallGrading?: boolean;
  allowStudentRegistration?: boolean;
  allowEditingApprovedProposal?: boolean;
  forceOpenReportSubmission?: boolean;
  enablePostDefenseSubmission?: boolean;
  requireReportApproval?: boolean;
  earlyInternshipGoalHours?: number;
  themePrimary?: string;
  themePrimaryForeground?: string;
  themeBackground?: string;
  themeForeground?: string;
  themeAccent?: string;
  themeAccentForeground?: string;
};

export type ProjectTopic = {
  id: string;
  sessionId: string;
  supervisorId: string;
  supervisorName: string;
  title: string;
  field?: string;
  summary: string;
  objectives: string;
  expectedResults: string;
  maxStudents: 1 | 2;
  status: "pending" | "approved" | "rejected" | "taken";
  rejectionReason?: string;
  createdAt: any;
};

export type WeeklyProgressReport = {
  id: string;
  registrationId: string;
  studentId: string;
  supervisorId: string;
  sessionId: string;
  weekNumber: number;
  submissionDate: any;
  workDone: string;
  nextWeekPlan: string;
  proofLink?: string;
  status: "pending_review" | "approved" | "rejected";
  supervisorComments?: string;
  reviewDate?: any;
};

export type InternshipPosition = {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  supervisorId?: string;
  supervisorName?: string;
};

export type InternshipCompany = {
  id: string;
  name: string;
  address?: string;
  description?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isLHU?: boolean;
  companySupervisorId?: string;
  companySupervisorName?: string;
  logoUrl?: string;
  ownerSupervisorId?: string; // Supervisor who declared/owns this company entry
  ownerSupervisorName?: string; // Cached name for quick display
  positions?: InternshipPosition[];
  createdAt?: any;
};

export type EarlyInternship = {
  id: string;
  studentId: string;
  studentName: string;
  studentIdentifier: string;
  companyName: string;
  companyAddress?: string;
  supervisorId: string;
  supervisorName: string;
  startDate: any;
  endDate?: any;
  proofLink?: string;
  status:
    | "pending_admin_approval"
    | "pending_company_approval"
    | "ongoing"
    | "completed"
    | "rejected_by_admin"
    | "rejected_by_company"
    | "cancelled";
  statusNote?: string;
  batch: string;
};

export type EarlyInternshipWeeklyReport = {
  id: string;
  earlyInternshipId: string;
  studentId: string;
  supervisorId: string;
  weekNumber: number;
  hours: number;
  supervisorComments?: string;
  reviewDate: any;
  status: "pending_review" | "approved" | "rejected";
};

export type Conversation = {
  id: string;
  subject: string;
  participantIds: string[];
  participantNames: string[];
  createdAt: any;
  lastMessageAt: any;
  lastMessageSnippet: string;
  readBy: string[];
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: any;
  mentionedUserIds?: string[];
};

export type ResourceLink = {
  label: string;
  url: string;
};

export type Resource = {
  id: string;
  name: string;
  summary?: string;
  category: "graduation" | "internship";
  links: ResourceLink[];
  createdAt: any;
};
