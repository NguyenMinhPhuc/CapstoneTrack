'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Check, X, CheckCircle, Clock, Activity } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, doc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import type { EarlyInternship, DefenseRegistration } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from './ui/dialog';
import { RejectionReasonDialog } from './rejection-reason-dialog';
import { ViewEarlyInternshipProgressDialog } from './view-early-internship-progress-dialog';


interface EarlyInternshipGuidanceTableProps {
  supervisorId: string;
}

const statusLabel: Record<EarlyInternship['status'], string> = {
  pending_approval: 'Chờ duyệt',
  ongoing: 'Đang thực tập',
  completed: 'Hoàn thành',
  rejected: 'Bị từ chối',
  cancelled: 'Đã hủy',
};

const statusVariant: Record<EarlyInternship['status'], 'secondary' | 'default' | 'outline' | 'destructive'> = {
  pending_approval: 'secondary',
  ongoing: 'default',
  completed: 'outline',
  rejected: 'destructive',
  cancelled: 'destructive',
};


export function EarlyInternshipGuidanceTable({ supervisorId }: EarlyInternshipGuidanceTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<EarlyInternship | null>(null);

  const internshipsQuery = useMemoFirebase(
    () => query(collection(firestore, 'earlyInternships'), where('supervisorId', '==', supervisorId)),
    [firestore, supervisorId]
  );
  
  const { data: internships, isLoading } = useCollection<EarlyInternship>(internshipsQuery);

  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return timestamp;
  };

  const handleStatusChange = async (internship: EarlyInternship, status: EarlyInternship['status'], note?: string) => {
    const docRef = doc(firestore, 'earlyInternships', internship.id);
    const dataToUpdate: Partial<EarlyInternship> = { status, statusNote: note || '' };
    
    const batch = writeBatch(firestore);
    batch.update(docRef, dataToUpdate);

    // If marking as completed, find ongoing session and add student
    if (status === 'completed') {
        try {
            const sessionsQuery = query(collection(firestore, 'graduationDefenseSessions'), where('status', '==', 'ongoing'));
            const sessionsSnapshot = await getDocs(sessionsQuery);
            if (sessionsSnapshot.empty) {
                toast({
                    variant: 'destructive',
                    title: 'Không tìm thấy đợt báo cáo',
                    description: 'Không có đợt báo cáo nào đang diễn ra để thêm sinh viên vào.',
                });
                return; // Stop if no ongoing session
            }
            const ongoingSession = sessionsSnapshot.docs[0]; // Use the first ongoing session found
            const ongoingSessionId = ongoingSession.id;

            // Check if student is already in this session
            const registrationQuery = query(
                collection(firestore, 'defenseRegistrations'),
                where('sessionId', '==', ongoingSessionId),
                where('studentDocId', '==', internship.studentId)
            );
            const registrationSnapshot = await getDocs(registrationQuery);
            
            const registrationData: Partial<DefenseRegistration> = {
                internshipStatus: 'reporting',
                internship_companyName: internship.companyName,
                internship_companyAddress: internship.companyAddress,
                internship_companySupervisorName: internship.supervisorName, // This is the early internship supervisor
                internshipSupervisorId: internship.supervisorId, // This is the early internship supervisor
                internshipSupervisorName: internship.supervisorName,
            };

            if (registrationSnapshot.empty) {
                // Create new registration
                const newRegistrationRef = doc(collection(firestore, 'defenseRegistrations'));
                const newRegistrationData: Partial<DefenseRegistration> = {
                     ...registrationData,
                    sessionId: ongoingSessionId,
                    studentDocId: internship.studentId,
                    studentId: internship.studentIdentifier,
                    studentName: internship.studentName,
                    graduationStatus: 'not_reporting',
                };
                 batch.set(newRegistrationRef, newRegistrationData, { merge: true });
            } else {
                // Update existing registration
                const existingRegistrationRef = registrationSnapshot.docs[0].ref;
                batch.update(existingRegistrationRef, registrationData);
            }

        } catch (error) {
            console.error("Error adding student to ongoing session:", error);
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Không thể tự động thêm sinh viên vào đợt báo cáo.',
            });
            return;
        }
    }
    
    try {
        await batch.commit();
        toast({ title: 'Thành công', description: 'Đã cập nhật trạng thái thực tập.' });
    } catch (error) {
        console.error("Error updating status:", error);
         toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể cập nhật trạng thái.' });
    }
  };

  const handleRejectClick = (internship: EarlyInternship) => {
    setSelectedInternship(internship);
    setIsRejectDialogOpen(true);
  };

  const handleProgressClick = (internship: EarlyInternship) => {
    setSelectedInternship(internship);
    setIsProgressDialogOpen(true);
  }
  
  if (isLoading) {
    return (
      <Card>
          <CardHeader>
              <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent>
              <Skeleton className="h-64 w-full" />
          </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Danh sách Sinh viên</CardTitle>
          <CardDescription>Các sinh viên đã chọn bạn làm người hướng dẫn thực tập sớm.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sinh viên</TableHead>
              <TableHead>Công ty</TableHead>
              <TableHead>Ngày bắt đầu</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {internships?.map((internship) => (
              <TableRow key={internship.id}>
                <TableCell>
                  <div className="font-medium">{internship.studentName}</div>
                  <div className="text-sm text-muted-foreground">{internship.studentIdentifier}</div>
                </TableCell>
                <TableCell>{internship.companyName}</TableCell>
                <TableCell>
                  {toDate(internship.startDate) ? format(toDate(internship.startDate)!, 'PPP') : 'N/A'}
                </TableCell>
                <TableCell>
                    <Badge variant={statusVariant[internship.status]}>
                        {statusLabel[internship.status]}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    {internship.status === 'pending_approval' && (
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(internship, 'ongoing')}>
                                <Check className="mr-2 h-4 w-4" /> Duyệt
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectClick(internship)}>
                                <X className="mr-2 h-4 w-4" /> Từ chối
                            </Button>
                        </div>
                    )}
                    {(internship.status === 'ongoing' || internship.status === 'completed') && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleProgressClick(internship)}>
                                     <Activity className="mr-2 h-4 w-4" />
                                    <span>Xem tiến độ</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(internship, 'completed', 'Hoàn thành tốt')}>
                                     <CheckCircle className="mr-2 h-4 w-4" />
                                    <span>Đánh dấu Hoàn thành</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleStatusChange(internship, 'cancelled', 'Không hoàn thành')}>
                                    <X className="mr-2 h-4 w-4" />
                                    <span>Hủy Thực tập</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
            {selectedInternship && (
                <RejectionReasonDialog
                    registration={selectedInternship as any} // Cast as any because the dialog expects DefenseRegistration
                    onConfirm={(reason) => {
                        handleStatusChange(selectedInternship, 'rejected', reason);
                        setIsRejectDialogOpen(false);
                        setSelectedInternship(null);
                    }}
                    onCancel={() => {
                        setIsRejectDialogOpen(false);
                        setSelectedInternship(null);
                    }}
                />
            )}
        </DialogContent>
    </Dialog>

    <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
            {selectedInternship && (
                <ViewEarlyInternshipProgressDialog
                    internship={selectedInternship}
                    onFinished={() => {
                        setIsProgressDialogOpen(false);
                        setSelectedInternship(null);
                    }}
                />
            )}
        </DialogContent>
    </Dialog>
    </>
  );
}
