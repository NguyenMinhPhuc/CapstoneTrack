'use client';
import { useState, ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogContent,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileWarning, Rocket } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
import type { Student, Supervisor, DefenseRegistration } from '@/lib/types';

interface RegistrationData {
    [key: string]: any;
}

interface ImportRegistrationsDialogProps {
    sessionId: string;
    onFinished: () => void;
}

export function ImportRegistrationsDialog({ sessionId, onFinished }: ImportRegistrationsDialogProps) {
    const [data, setData] = useState<RegistrationData[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [isImporting, setIsImporting] = useState<boolean>(false);
    const [importProgress, setImportProgress] = useState<number>(0);
    const { toast } = useToast();
    const firestore = useFirestore();

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const workbook = XLSX.read(event.target?.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData: RegistrationData[] = XLSX.utils.sheet_to_json(sheet);

                if (jsonData.length > 0) {
                    setHeaders(Object.keys(jsonData[0]));
                    setData(jsonData);
                }
            } catch (error) {
                console.error("Error reading Excel file:", error);
                toast({
                    variant: 'destructive',
                    title: 'Lỗi đọc tệp',
                    description: 'Không thể đọc hoặc phân tích tệp Excel. Vui lòng kiểm tra định dạng tệp.',
                });
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        setIsImporting(true);
        setImportProgress(0);

        let successCount = 0;
        let errorCount = 0;

        const studentMap = new Map<string, Student>();
        const supervisorMap = new Map<string, Supervisor>();

        try {
            const [studentsSnapshot, supervisorsSnapshot] = await Promise.all([
                getDocs(collection(firestore, 'students')),
                getDocs(collection(firestore, 'supervisors'))
            ]);
            
            studentsSnapshot.forEach(doc => {
                const student = { id: doc.id, ...doc.data() } as Student;
                if (student.studentId) {
                    studentMap.set(String(student.studentId), student);
                }
            });

            supervisorsSnapshot.forEach(doc => {
                const supervisor = { id: doc.id, ...doc.data() } as Supervisor;
                const fullName = `${supervisor.firstName} ${supervisor.lastName}`.toLowerCase().trim();
                supervisorMap.set(fullName, supervisor);
            })

        } catch (e) {
             toast({
                variant: 'destructive',
                title: 'Lỗi tải dữ liệu',
                description: 'Không thể tải danh sách sinh viên hoặc GVHD từ hệ thống.',
            });
            setIsImporting(false);
            return;
        }

        const batch = writeBatch(firestore);
        const registrationsCollectionRef = collection(firestore, 'defenseRegistrations');
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const studentIdNumber = String(row['StudentID'] || row['Mã SV'] || '');
            
            if (!studentIdNumber) {
                console.warn(`Skipping row ${i + 2} due to missing StudentID.`);
                errorCount++;
                continue;
            }
            
            const studentInfo = studentMap.get(studentIdNumber);

            if (!studentInfo) {
                console.warn(`Skipping row ${i + 2}: Student with ID "${studentIdNumber}" not found in the system.`);
                errorCount++;
                continue;
            }

            const supervisorName = (row['SupervisorName'] || row['GVHD'] || '').trim();
            const supervisorInfo = supervisorMap.get(supervisorName.toLowerCase());

            const newRegistrationRef = doc(registrationsCollectionRef);
            const registrationData: Partial<DefenseRegistration> = {
                sessionId: sessionId,
                studentDocId: studentInfo.id,
                studentId: studentIdNumber,
                studentName: `${studentInfo.firstName} ${studentInfo.lastName}`,
                projectTitle: row['ProjectTitle'] || row['Tên đề tài'] || '',
                supervisorId: supervisorInfo?.id || '',
                supervisorName: supervisorInfo ? `${supervisorInfo.firstName} ${supervisorInfo.lastName}` : '',
                registrationDate: serverTimestamp(),
                graduationStatus: 'reporting',
                internshipStatus: 'not_reporting',
            };
            batch.set(newRegistrationRef, registrationData);
            successCount++;
            setImportProgress(((i + 1) / data.length) * 100);
        }

        try {
            await batch.commit();
            toast({
                title: 'Hoàn tất nhập liệu',
                description: `Thành công: ${successCount}. Thất bại: ${errorCount}.`,
            });
             if (errorCount === 0) {
                onFinished();
            }
        } catch (error) {
            console.error("Error committing batch:", error);
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Đã xảy ra lỗi khi lưu dữ liệu vào hệ thống.',
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-4xl grid grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
            <DialogHeader className="p-6 pb-0">
                <DialogTitle>Nhập danh sách sinh viên từ Excel</DialogTitle>
                <DialogDescription>
                    Tải lên tệp Excel để thêm hàng loạt sinh viên vào đợt báo cáo này. Tệp phải chứa cột 'StudentID' (hoặc 'Mã SV'). Các cột 'ProjectTitle' ('Tên đề tài') và 'SupervisorName' ('GVHD') là tùy chọn.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 px-6 space-y-4 overflow-y-auto">
                <Input
                    id="excel-file"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                />
                {data.length > 0 ? (
                    <div className="space-y-4">
                        <Alert>
                           <Rocket className="h-4 w-4" />
                            <AlertTitle>Tệp đã sẵn sàng!</AlertTitle>
                            <AlertDescription>
                                Đã tải {data.length} bản ghi từ {fileName}. Xem trước dữ liệu bên dưới và nhấn "Nhập" để bắt đầu.
                            </AlertDescription>
                        </Alert>
                        <div className="overflow-auto rounded-md border max-h-64">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background">
                                    <TableRow>
                                        {headers.map((header) => (
                                            <TableHead key={header}>{header}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.slice(0, 10).map((row, index) => ( // Preview first 10 rows
                                        <TableRow key={index}>
                                            {headers.map((header) => (
                                                <TableCell key={header}>{row[header]}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <Alert variant="default">
                        <FileWarning className="h-4 w-4" />
                        <AlertTitle>Chưa có tệp</AlertTitle>
                        <AlertDescription>
                            Vui lòng chọn một tệp Excel để bắt đầu quá trình nhập.
                        </AlertDescription>
                    </Alert>
                )}
                 {isImporting && (
                    <div className="space-y-2">
                        <p>Đang nhập... {Math.round(importProgress)}%</p>
                        <Progress value={importProgress} />
                    </div>
                )}
            </div>
            <DialogFooter className="p-6 pt-0 border-t">
                <Button variant="outline" onClick={onFinished} disabled={isImporting}>Hủy</Button>
                <Button onClick={handleImport} disabled={data.length === 0 || isImporting}>
                    {isImporting ? 'Đang nhập...' : `Nhập ${data.length} sinh viên`}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
