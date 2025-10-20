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
import { Book, CheckCircle, Target, User, Users, Tag, Clock, CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

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
        alertDesc: "Bạn đã đăng ký thành công đề tài này. Vui lòng liên hệ giáo viên hướng dẫn để được hỗ trợ các bước tiếp theo.",
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


export function RegisteredTopicDetails({ topic, registration }: RegisteredTopicDetailsProps) {
  const status = registration.projectRegistrationStatus || 'pending';
  const config = registrationStatusConfig[status] || registrationStatusConfig.default;

  return (
    <div>
        <Alert>
            {config.icon}
            <AlertTitle>{config.alert}</AlertTitle>
            <AlertDescription>
                {config.alertDesc}
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
                  <Badge variant={config.variant}>{config.label}</Badge>
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
        </Card>
    </div>
  );
}
