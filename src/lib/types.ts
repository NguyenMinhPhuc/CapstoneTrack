export type Application = {
  id: string;
  studentName: string;
  studentId: string;
  avatar: string;
  projectTitle: string;
  supervisor?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submissionDate: string;
};

export type StudentProgress = {
  stage: string;
  count: number;
};
