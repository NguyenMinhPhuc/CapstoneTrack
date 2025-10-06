
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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

interface UserData {
    [key: string]: any;
}

interface ImportUsersDialogProps {
    onFinished: () => void;
}

// Helper to get a secondary app instance for user creation
const getSecondaryApp = () => {
    const secondaryAppName = 'secondary-app-for-user-creation';
    const existingApp = getApps().find(app => app.name === secondaryAppName);
    if (existingApp) {
        return existingApp;
    }
    return initializeApp(firebaseConfig, secondaryAppName);
};

export function ImportUsersDialog({ onFinished }: ImportUsersDialogProps) {
    const [data, setData] = useState<UserData[]>([]);
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
                const jsonData: UserData[] = XLSX.utils.sheet_to_json(sheet);

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

        const secondaryApp = getSecondaryApp();
        const tempAuth = getAuth(secondaryApp);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            const studentIdValue = row['StudentID'] || row['Mã SV'];
            const email = row['Email'] || (studentIdValue ? `${studentIdValue}@lhu.edu.vn` : '');
            const password = row['Password'] || '123456'; // Default password
            const role = row['Role']?.toLowerCase() || 'student'; // Default role
            const firstName = row['HoSV'] || '';
            const lastName = row['TenSV'] || '';

            if (!email || !studentIdValue) {
                errorCount++;
                console.warn(`Skipping row ${i + 2} due to missing email or StudentID.`);
                continue;
            }

            try {
                // 1. Create user in Auth
                const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
                const user = userCredential.user;

                // 2. Create doc in 'users' collection
                const userDocRef = doc(firestore, 'users', user.uid);
                await setDoc(userDocRef, {
                    email: email,
                    role: role,
                    status: 'active',
                    createdAt: serverTimestamp(),
                });

                // 3. Create doc in role-specific collection
                 const dataToSet: any = {
                    ...row,
                    email: email,
                    userId: user.uid,
                    createdAt: serverTimestamp(),
                    firstName: firstName,
                    lastName: lastName,
                    studentId: String(studentIdValue || ''), // Ensure studentId is always a string
                };

                 // Clean up the object to remove any fields that were not in the excel, but are in the row object due to sheet_to_json
                Object.keys(dataToSet).forEach(key => {
                    if (dataToSet[key] === undefined || key === 'StudentID') {
                        delete dataToSet[key];
                    }
                });


                if (role === 'student') {
                    const studentDocRef = doc(firestore, 'students', user.uid);
                    await setDoc(studentDocRef, dataToSet);
                } else if (role === 'supervisor') {
                    const supervisorDocRef = doc(firestore, 'supervisors', user.uid);
                    await setDoc(supervisorDocRef, dataToSet);
                }

                // Important: Sign out the created user from the temporary auth instance
                if (tempAuth.currentUser?.uid === user.uid) {
                    await signOut(tempAuth);
                }
                
                successCount++;
            } catch (error: any) {
                errorCount++;
                console.error(`Error importing user ${email}:`, error);
                console.error("Data that caused the error:", row);
            }
            setImportProgress(((i + 1) / data.length) * 100);
        }

        setIsImporting(false);
        toast({
            title: 'Hoàn tất nhập liệu',
            description: `Thành công: ${successCount}. Thất bại: ${errorCount}.`,
        });
        if (errorCount === 0) {
            onFinished();
        }
    };

    return (
        <DialogContent className="sm:max-w-4xl grid grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
            <DialogHeader className="p-6 pb-0">
                <DialogTitle>Import Users from Excel</DialogTitle>
                <DialogDescription>
                    Upload an Excel file to bulk-create user accounts. The file must contain columns like 'StudentID' (or 'Mã SV'), 'HoSV', 'TenSV', 'Email', and 'Role'. 'Password' is optional.
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
                            <AlertTitle>File Ready!</AlertTitle>
                            <AlertDescription>
                                Loaded {data.length} records from {fileName}. Review the preview below and click Import to start.
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
                        <AlertTitle>Awaiting File</AlertTitle>
                        <AlertDescription>
                            Please select an Excel file to begin the import process.
                        </AlertDescription>
                    </Alert>
                )}
                 {isImporting && (
                    <div className="space-y-2">
                        <p>Importing... {Math.round(importProgress)}%</p>
                        <Progress value={importProgress} />
                    </div>
                )}
            </div>
            <DialogFooter className="p-6 pt-0 border-t">
                <Button variant="outline" onClick={onFinished} disabled={isImporting}>Cancel</Button>
                <Button onClick={handleImport} disabled={data.length === 0 || isImporting}>
                    {isImporting ? 'Importing...' : `Import ${data.length} Users`}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

    