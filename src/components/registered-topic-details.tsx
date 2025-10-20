

'use client';

import type { ProjectTopic, DefenseRegistration, SystemSettings, GraduationDefenseSession } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, CheckCircle, Target, User, Users, Tag, Clock, CircleAlert, CircleCheck, CircleX, FileSignature, FileUp, Calendar } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { sub, add, format, isWithinInterval } from 'date-fns';
import { useMemo } from 'react';


interface RegisteredTopicDetailsProps {
  topic: ProjectTopic;
  registration: DefenseRegistration;
  session: GraduationDefenseSession;
}

const registrationStatusConfig = {
    pending: {
        label: "Chờ GVHD xác nhận",
        icon: <Clock className="h-4 w-4" />,
        variant: "secondary" as const,
        alert: "Chờ xác nhận",
        alertDesc: "Yêu cầu đăng ký của bạn đã được gửi đến giáo viên hướng dẫn. Vui lòng chờ xác nhận.",
    },
    approved: {
        label: "Đã được xác nhận",
        icon: <CircleCheck className="h-4 w-4 text-green-500" />,
        variant: "default" as const,
        alert: "Đăng ký thành công!",
        alertDesc: "Bạn đã đăng ký thành công đề tài này. Vui lòng liên hệ giáo viên hướng dẫn và bắt đầu nộp thuyết minh đề tài.",
    },
    rejected: {
        label: "Bị từ chối",
        icon: <CircleX className="h-4 w-4 text-red-500" />,
        variant: "destructive" as const,
        alert: "Đăng ký bị từ chối",
        alertDesc: "Yêu cầu đăng ký của bạn đã bị từ chối. Bạn có thể hủy đăng ký để chọn một đề tài khác.",
    },
     default: {
        label: "Chờ GVHD xác nhận",
        icon: <Clock className="h-4 w-4" />,
        variant: "secondary" as const,
        alert: "Chờ xác nhận",
        alertDesc: "Yêu cầu đăng ký của bạn đã được gửi đến giáo viên hướng dẫn. Vui lòng chờ xác nhận.",
    }
}

const proposalStatusConfig = {
    not_submitted: { label: "Chưa nộp thuyết minh", variant: "outline" as const },
    pending_approval: { label: "Chờ duyệt thuyết minh", variant: "secondary" as const },
    approved: { label: "Đã duyệt thuyết minh", variant: "default" as const },
    rejected: { label: "Cần chỉnh sửa", variant: "destructive" as const },
};


export function RegisteredTopicDetails({ topic, registration, session }: RegisteredTopicDetailsProps) {
  const firestore = useFirestore();
  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'systemSettings', 'features'), [firestore]);
  const { data: settings } = useDoc<SystemSettings>(settingsDocRef);
  
  const regStatus = registration.projectRegistrationStatus || 'pending';
  const regConfig = registrationStatusConfig[regStatus] || registrationStatusConfig.default;
  
  const propStatus = registration.proposalStatus || 'not_submitted';
  const propConfig = proposalStatusConfig[propStatus];
  
  const canEditApprovedProposal = settings?.allowEditingApprovedProposal ?? false;
  const showSubmitProposalButton = regStatus === 'approved' && (propStatus !== 'approved' || canEditApprovedProposal);

  const reportSubmission = useMemo(() => {
    if (!session.expectedReportDate) return null;
    
    // Convert Firestore Timestamp to Date
    const toDate = (timestamp: any): Date | undefined => {
        if (!timestamp) return undefined;
        if (timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
        }
        return timestamp; // Assume it's already a Date object
    };

    const reportDate = toDate(session.expectedReportDate);
    if (!reportDate) return null;

    const startDate = sub(reportDate, { weeks: 2 });
    const endDate = sub(reportDate, { weeks: 1 });
    const now = new Date();

    return {
        startDate,
        endDate,
        isWindowOpen: isWithinInterval(now, { start: startDate, end: endDate }),
    }
  }, [session.expectedReportDate]);
  
  const canSubmitReport = (reportSubmission?.isWindowOpen || settings?.forceOpenReportSubmission);


  return (
    <div>
        <Alert>
            {regConfig.icon}
            <AlertTitle>{regConfig.alert}</AlertTitle>
            <AlertDescription>
                {regConfig.alertDesc}
            </AlertDescription>
        </Alert>
        {propStatus === 'approved' && reportSubmission && (
            <Alert className="mt-4 border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-300">
                <Calendar className="h-4 w-4" />
                <AlertTitle>Giai đoạn nộp báo cáo</AlertTitle>
                <AlertDescription>
                   Thời gian nộp báo cáo toàn văn: Từ ngày <strong>{format(reportSubmission.startDate, 'dd/MM/yyyy')}</strong> đến ngày <strong>{format(reportSubmission.endDate, 'dd/MM/yyyy')}</strong>.
                   {canSubmitReport
                        ? " Hiện đang trong thời gian nộp báo cáo." 
                        : " Hiện đã hết thời gian nộp báo cáo."
                   }
                </AlertDescription>
            </Alert>
        )}
        <Card className="mt-6 border-primary">
            <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                      <CardTitle>{topic.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 pt-1">
                          <User className="h-4 w-4" />
                          {topic.supervisorName}
                      </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={regConfig.variant}>{regConfig.label}</Badge>
                     {regStatus === 'approved' && (
                        <Badge variant={propConfig.variant}>{propConfig.label}</Badge>
                    )}
                  </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    {topic.maxStudents} Sinh viên
                  </Badge>
                   {topic.field && (
                    <Badge variant="secondary" className="flex items-center gap-1.5">
                      <Tag className="h-3 w-3" />
                      {topic.field}
                    </Badge>
                  )}
              </div>
                <div className={cn(
                    "prose prose-sm text-muted-foreground max-w-none space-y-3",
                    "[&_ul]:list-disc [&_ul]:pl-4",
                    "[&_ol]:list-decimal [&_ol]:pl-4",
                    "[&_p]:m-0"
                )}>
                  <div className="flex items-start gap-3">
                      <Book className="h-4 w-4 mt-1 shrink-0" />
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.summary}</ReactMarkdown>
                  </div>
                  {topic.objectives && (
                      <div className="flex items-start gap-3">
                          <Target className="h-4 w-4 mt-1 shrink-0" />
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.objectives}</ReactMarkdown>
                      </div>
                  )}
                  {topic.expectedResults && (
                      <div className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 mt-1 shrink-0" />
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.expectedResults}</ReactMarkdown>
                      </div>
                  )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-2">
                 {showSubmitProposalButton && (
                    <Button asChild className="w-full">
                        <Link href="/proposal-submission">
                            <FileSignature className="mr-2 h-4 w-4" />
                            {registration.proposalStatus === 'not_submitted' || registration.proposalStatus === 'rejected' ? 'Nộp Thuyết minh' : 'Cập nhật Thuyết minh'}
                        </Link>
                    </Button>
                )}
                 {propStatus === 'approved' && reportSubmission && (
                    <Button asChild className="w-full" disabled={!canSubmitReport}>
                         <Link href="/report-submission">
                            <FileUp className="mr-2 h-4 w-4" />
                            Nộp Báo cáo
                        </Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    </div>
  );
}
