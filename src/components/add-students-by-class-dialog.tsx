

'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import type { Student, DefenseRegistration, DefenseSession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Info } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface AddStudentsByClassDialogProps {
  sessionId: string;
  sessionType: DefenseSession['sessionType'];
  existingRegistrations: DefenseRegistration[];
  onFinished: () => void;
}

const statusLabel: Record<Student['status'], string> = {
  studying: 'Đang học',
  reserved: 'Bảo lưu',
  dropped_out: 'Đã nghỉ',
  graduated: 'Đã tốt nghiệp',
};

const statusColorClass: Record<Student['status'], string> = {
  studying: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
  reserved: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700',
  dropped_out: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
  graduated: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
};


export function AddStudentsByClassDialog({
  sessionId,
  sessionType,
  existingRegistrations,
  onFinished,
}: AddStudentsByClassDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const studentsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'students'),
    [firestore]
  );
  const { data: allStudents, isLoading: isLoadingStudents } = useCollection<Student>(studentsCollectionRef);

  const uniqueClasses = useMemo(() => {
    if (!allStudents) return [];
    const classSet = new Set<string>();
    allStudents.forEach(student => {
      if (student.className) {
        classSet.add(student.className);
      }
    });
    return Array.from(classSet).sort();
  }, [allStudents]);

  const studentsInSelectedClass = useMemo(() => {
    if (!selectedClass || !allStudents) return [];
    const registeredStudentIds = new Set(existingRegistrations.map(reg => reg.studentDocId));
    return allStudents.filter(
      student =>
        student.className === selectedClass && !registeredStudentIds.has(student.id)
    );
  }, [selectedClass, allStudents, existingRegistrations]);

  useEffect(() => {
      // Reset selections when class changes
      setSelectedStudentIds([]);
  }, [selectedClass])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(studentsInSelectedClass.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    setSelectedStudentIds(prev =>
      checked ? [...prev, studentId] : prev.filter(id => id !== studentId)
    );
  };

  const handleSubmit = async () => {
    if (selectedStudentIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Chưa chọn sinh viên',
        description: 'Vui lòng chọn ít nhất một sinh viên để thêm vào đợt.',
      });
      return;
    }
    setIsSubmitting(true);

    const batch = writeBatch(firestore);
    const registrationsCollectionRef = collection(firestore, 'defenseRegistrations');
    
    selectedStudentIds.forEach(studentDocId => {
        const studentData = allStudents?.find(s => s.id === studentDocId);
        if (studentData) {
            const newRegistrationRef = doc(registrationsCollectionRef);
            
            const newRegistrationData: any = {
                sessionId: sessionId,
                studentDocId: studentData.id,
                studentId: studentData.studentId,
                studentName: `${studentData.firstName} ${studentData.lastName}`,
                projectTitle: '',
                supervisorName: '',
                registrationDate: serverTimestamp(),
            };

            if (sessionType === 'graduation') {
                newRegistrationData.graduationStatus = 'reporting';
                newRegistrationData.internshipStatus = 'not_reporting';
            } else if (sessionType === 'internship') {
                newRegistrationData.graduationStatus = 'not_reporting';
                newRegistrationData.internshipStatus = 'reporting';
            } else { // combined
                newRegistrationData.graduationStatus = 'reporting';
                newRegistrationData.internshipStatus = 'reporting';
            }

            batch.set(newRegistrationRef, newRegistrationData);
        }
    });

    try {
        await batch.commit();
        toast({
            title: 'Thành công',
            description: `Đã thêm ${selectedStudentIds.length} sinh viên vào đợt báo cáo.`,
        });
        onFinished();
    } catch(error: any) {
        console.error("Error adding students by class:", error);
        toast({
            variant: 'destructive',
            title: 'Lỗi',
            description: `Không thể thêm sinh viên: ${error.message}`
        })
    } finally {
        setIsSubmitting(false);
    }

  };

  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Thêm sinh viên theo lớp</DialogTitle>
        <DialogDescription>
          Chọn một lớp để xem danh sách sinh viên và thêm họ vào đợt báo cáo này.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <Select onValueChange={setSelectedClass} disabled={isLoadingStudents}>
          <SelectTrigger>
            <SelectValue placeholder={isLoadingStudents ? "Đang tải danh sách lớp..." : "Chọn một lớp"} />
          </SelectTrigger>
          <SelectContent>
            {uniqueClasses.map(className => (
              <SelectItem key={className} value={className}>
                {className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoadingStudents && selectedClass && (
            <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                 <Skeleton className="h-20 w-full" />
            </div>
        )}

        {selectedClass && !isLoadingStudents && (
          studentsInSelectedClass.length > 0 ? (
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="select-all"
                        onCheckedChange={handleSelectAll}
                        checked={selectedStudentIds.length > 0 && selectedStudentIds.length === studentsInSelectedClass.length}
                        indeterminate={selectedStudentIds.length > 0 && selectedStudentIds.length < studentsInSelectedClass.length}
                    />
                    <Label htmlFor="select-all" className="font-medium">
                        Chọn tất cả ({selectedStudentIds.length}/{studentsInSelectedClass.length})
                    </Label>
                </div>
                <ScrollArea className="h-64 rounded-md border p-2">
                    <div className="space-y-1">
                    {studentsInSelectedClass.map(student => (
                        <div key={student.id} className="flex items-center space-x-3 p-1 rounded-md hover:bg-muted/50">
                        <Checkbox
                            id={student.id}
                            onCheckedChange={checked => handleStudentSelect(student.id, !!checked)}
                            checked={selectedStudentIds.includes(student.id)}
                        />
                        <div className="flex items-center justify-between w-full">
                            <Label htmlFor={student.id} className="cursor-pointer">
                                {student.firstName} {student.lastName} ({student.studentId})
                            </Label>
                            <Badge className={cn('text-xs', statusColorClass[student.status])} variant="outline">
                                {statusLabel[student.status]}
                            </Badge>
                        </div>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
            </div>
          ) : (
             <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Không có sinh viên nào</AlertTitle>
                <AlertDescription>
                    Tất cả sinh viên trong lớp này đã được thêm vào đợt báo cáo.
                </AlertDescription>
            </Alert>
          )
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFinished} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || selectedStudentIds.length === 0}>
          {isSubmitting ? "Đang thêm..." : `Thêm ${selectedStudentIds.length} sinh viên`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
