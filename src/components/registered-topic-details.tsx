'use client';

import type { ProjectTopic, DefenseRegistration } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, CheckCircle, Target, User, Users, Tag, Clock, CircleAlert, CircleCheck, CircleX, FileSignature } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import Link from 'next/link';

interface RegisteredTopicDetailsProps {
  topic: ProjectTopic;
  registration: DefenseRegistration;
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


export function RegisteredTopicDetails({ topic, registration }: RegisteredTopicDetailsProps) {
  const regStatus = registration.projectRegistrationStatus || 'pending';
  const regConfig = registrationStatusConfig[regStatus] || registrationStatusConfig.default;
  
  const propStatus = registration.proposalStatus || 'not_submitted';
  const propConfig = proposalStatusConfig[propStatus];

  return (
    <div>
        <Alert>
            {regConfig.icon}
            <AlertTitle>{regConfig.alert}</AlertTitle>
            <AlertDescription>
                {regConfig.alertDesc}
            </AlertDescription>
        </Alert>
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
             {regStatus === 'approved' && (
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href="/proposal-submission">
                            <FileSignature className="mr-2 h-4 w-4" />
                            {registration.proposalStatus === 'not_submitted' || registration.proposalStatus === 'rejected' ? 'Nộp Thuyết minh' : 'Cập nhật Thuyết minh'}
                        </Link>
                    </Button>
                </CardFooter>
            )}
        </Card>
    </div>
  );
}
