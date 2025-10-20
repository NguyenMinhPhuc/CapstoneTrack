
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
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

interface CompanyData {
    [key: string]: any;
}

interface ImportCompaniesDialogProps {
    onFinished: () => void;
}

export function ImportCompaniesDialog({ onFinished }: ImportCompaniesDialogProps) {
    const [data, setData] = useState<CompanyData[]>([]);
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
                const jsonData: CompanyData[] = XLSX.utils.sheet_to_json(sheet);

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

        const batch = writeBatch(firestore);
        const companiesCollectionRef = collection(firestore, 'internshipCompanies');
        let successCount = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const newCompanyRef = doc(companiesCollectionRef);
            
            const isLHUValue = String(row.isLHU || 'false').toLowerCase();
            const isLHU = ['true', '1', 'yes'].includes(isLHUValue);

            const companyData = {
                name: String(row.name || ''),
                address: String(row.address || ''),
                website: String(row.website || ''),
                description: String(row.description || ''),
                contactName: String(row.contactName || ''),
                contactEmail: String(row.contactEmail || ''),
                contactPhone: String(row.contactPhone || ''),
                isLHU: isLHU,
                createdAt: serverTimestamp(),
            };

            batch.set(newCompanyRef, companyData);
            successCount++;
            setImportProgress(((i + 1) / data.length) * 100);
        }

        try {
            await batch.commit();
            toast({
                title: 'Hoàn tất nhập liệu',
                description: `Đã nhập thành công ${successCount} doanh nghiệp.`,
            });
            onFinished();
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
                <DialogTitle>Nhập danh sách Doanh nghiệp từ Excel</DialogTitle>
                <DialogDescription>
                    Tải lên tệp Excel để thêm hàng loạt doanh nghiệp. Hệ thống sẽ đọc các cột có tiêu đề: name, address, website, description, contactName, contactEmail, contactPhone, isLHU.
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
                                                <TableCell key={header}>{String(row[header] || '')}</TableCell>
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
                    {isImporting ? 'Đang nhập...' : `Nhập ${data.length} doanh nghiệp`}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
