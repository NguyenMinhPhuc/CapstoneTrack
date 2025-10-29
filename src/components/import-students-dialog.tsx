
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
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

interface StudentData {
    [key: string]: any;
}

interface ImportStudentsDialogProps {
    onFinished: () => void;
}

// Helper to get a secondary app instance for user creation
const getSecondaryApp = () => {
    const secondaryAppName = 'secondary-app-for-student-creation';
    const existingApp = getApps().find(app => app.name === secondaryAppName);
    return existingApp || initializeApp(firebaseConfig, secondaryAppName);
};

const mapStatus = (status: string | undefined): 'studying' | 'reserved' | 'dropped_out' | 'graduated' => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus.includes('đang học')) return 'studying';
    if (lowerStatus.includes('bảo lưu')) return 'reserved';
    if (lowerStatus.includes('thôi học') || lowerStatus.includes('đã nghỉ')) return 'dropped_out';
    if (lowerStatus.includes('tốt nghiệp')) return 'graduated';
    return 'studying'; // Default status
}

export function ImportStudentsDialog({ onFinished }: ImportStudentsDialogProps) {
    const [data, setData] = useState<StudentData[]>([]);
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
                
                const jsonData: StudentData[] = XLSX.utils.sheet_to_json(sheet, {
                    defval: "" // Use empty string for blank cells
                });

                if (jsonData.length > 0) {
                    const firstRow = jsonData[0];
                    const processedHeaders = Object.keys(firstRow).map(h => h.trim());
                    setHeaders(processedHeaders);

                    const processedData = jsonData.map(row => {
                        const newRow: StudentData = {};
                        for (const key in row) {
                            newRow[key.trim()] = row[key];
                        }
                        return newRow;
                    });
                    setData(processedData);
                } else {
                    toast({ variant: 'destructive', title: 'Tệp rỗng', description: 'Tệp Excel không chứa dữ liệu.' });
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

        const secondaryApp = getSecondaryApp();
        const tempAuth = getAuth(secondaryApp);

        let successCount = 0;
        let errorCount = 0;
        const failedRows: any[] = [];
        
        // Pre-fetch all existing user emails to check for duplicates
        const existingEmails = new Set<string>();
        try {
            const usersSnapshot = await getDocs(collection(firestore, 'users'));
            usersSnapshot.forEach(doc => existingEmails.add(doc.data().email));
        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Lỗi tải dữ liệu',
                description: 'Không thể tải danh sách người dùng hiện tại để kiểm tra trùng lặp.',
            });
            setIsImporting(false);
            return;
        }


        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            const studentIdValue = row['Mã SV'] || row['StudentID'];
            const email = row['Email'] || (studentIdValue ? `${studentIdValue}@lhu.edu.vn` : undefined);
            const password = String(row['Password'] || '123456');
            
            if (!email || !studentIdValue) {
                errorCount++;
                failedRows.push({ ...row, reason: 'Thiếu Email hoặc Mã SV' });
                console.warn(`Skipping row ${i + 2} due to missing email or StudentID.`);
                setImportProgress(((i + 1) / data.length) * 100);
                continue;
            }

            if (existingEmails.has(email)) {
                errorCount++;
                failedRows.push({ ...row, reason: `Email '${email}' đã tồn tại.` });
                console.warn(`Skipping row ${i + 2} because email '${email}' already exists.`);
                setImportProgress(((i + 1) / data.length) * 100);
                continue;
            }

            try {
                // 1. Create user in Auth
                const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
                const user = userCredential.user;

                // Use a single batch for this user's writes
                const batch = writeBatch(firestore);

                // 2. Create doc in 'users' collection
                const userDocRef = doc(firestore, 'users', user.uid);
                batch.set(userDocRef, {
                    id: user.uid,
                    email: email,
                    role: 'student',
                    status: 'active',
                    createdAt: serverTimestamp(),
                });

                // 3. Create doc in 'students' collection
                const studentDocRef = doc(firestore, 'students', user.uid);
                const studentData = {
                    id: user.uid,
                    userId: user.uid,
                    email: email,
                    studentId: String(studentIdValue),
                    firstName: row['HoSV'] || row['HoLot'] || '',
                    lastName: row['TenSV'] || row['Ten'] || '',
                    major: row['Ngành'] || row['tenNganh'] || '',
                    enrollmentYear: null,
                    className: row['Lop'] || row['LopID'] || '',
                    phone: String(row['SoDienThoai'] || ''),
                    CCCD: String(row['CMND'] || row['cmnd'] || ''),
                    status: mapStatus(row['Tình trạng'] || row['TinhTrang']),
                    createdAt: serverTimestamp(),
                };
                batch.set(studentDocRef, studentData);
                
                await batch.commit();

                // Important: Sign out the created user from the temporary auth instance
                if (tempAuth.currentUser?.uid === user.uid) {
                    await signOut(tempAuth);
                }
                
                successCount++;
                existingEmails.add(email); // Add to set to prevent duplicates within the same batch

            } catch (error: any) {
                errorCount++;
                failedRows.push({ ...row, reason: error.code || error.message });
                console.error(`Error importing user ${email}:`, error, "Row data:", row);
            }
            setImportProgress(((i + 1) / data.length) * 100);
        }

        setIsImporting(false);
        toast({
            title: 'Hoàn tất nhập liệu',
            description: `Thành công: ${successCount}. Thất bại: ${errorCount}.`,
            duration: 9000,
        });
        
        if (errorCount > 0) {
            console.error("Failed rows:", failedRows);
            // Optionally, provide a way to download the error report
        }

        if (errorCount === 0) {
            onFinished();
        }
    };

    return (
        <DialogContent className="sm:max-w-4xl grid grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
            <DialogHeader className="p-6 pb-0">
                <DialogTitle>Nhập sinh viên từ Excel</DialogTitle>
                <DialogDescription>
                    Tải lên tệp Excel để tạo hàng loạt tài khoản. Các cột cần thiết: 'Mã SV', 'HoSV', 'TenSV', 'Email'. Các cột khác là tùy chọn.
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
                                                <TableCell key={header}>
                                                    {String(row[header] ?? '')}
                                                </TableCell>
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
