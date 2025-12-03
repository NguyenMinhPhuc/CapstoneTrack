"use client";

import { useState, ChangeEvent, useMemo } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogContent,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileWarning, Rocket } from "lucide-react";
import { useFirestore } from "@/firebase";
import {
  collection,
  writeBatch,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ImportTopicsDialogProps {
  supervisorId: string;
  supervisorName: string;
  sessions: Array<{ id: string; name: string; status: string }>;
  onFinished: () => void;
}

export function ImportTopicsDialog({
  supervisorId,
  supervisorName,
  sessions,
  onFinished,
}: ImportTopicsDialogProps) {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const { toast } = useToast();
  const firestore = useFirestore();

  const availableSessions = useMemo(
    () =>
      sessions.filter((s) => s.status === "upcoming" || s.status === "ongoing"),
    [sessions]
  );

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length > 0) {
          setHeaders(Object.keys(jsonData[0]));
          setData(jsonData);
          toast({
            title: "Thành công",
            description: `Đã đọc ${jsonData.length} dòng từ file ${file.name}`,
          });
        } else {
          toast({
            variant: "destructive",
            title: "File trống",
            description: "File Excel không có dữ liệu. Vui lòng kiểm tra lại.",
          });
        }
      } catch (error) {
        console.error("Error reading Excel file:", error);
        toast({
          variant: "destructive",
          title: "Lỗi đọc tệp",
          description:
            "Không thể đọc hoặc phân tích tệp Excel. Vui lòng kiểm tra định dạng tệp.",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!selectedSessionId) {
      toast({
        variant: "destructive",
        title: "Thiếu thông tin",
        description: "Vui lòng chọn đợt báo cáo để gán đề tài.",
      });
      return;
    }
    setIsImporting(true);
    setImportProgress(0);

    const batch = writeBatch(firestore);
    const topicsCollectionRef = collection(firestore, "projectTopics");
    let successCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const newTopicRef = doc(topicsCollectionRef);

      const maxStudentsRaw = String(row.maxStudents || "1");
      const maxStudents =
        maxStudentsRaw === "2" || maxStudentsRaw === "2.0" ? 2 : 1;

      const title = String(row.title || "").trim();
      if (!title) continue; // skip empty rows

      const topicData = {
        sessionId: selectedSessionId,
        supervisorId,
        supervisorName,
        title,
        field: String(row.field || ""),
        summary: String(row.summary || ""),
        objectives: String(row.objectives || ""),
        expectedResults: String(row.expectedResults || ""),
        maxStudents: maxStudents as 1 | 2,
        status: "pending" as const,
        createdAt: serverTimestamp(),
      };

      batch.set(newTopicRef, topicData);
      successCount++;
      setImportProgress(((i + 1) / data.length) * 100);
    }

    try {
      await batch.commit();
      toast({
        title: "Hoàn tất nhập",
        description: `Đã nhập thành công ${successCount} đề tài.`,
      });
      onFinished();
    } catch (error) {
      console.error("Error committing batch:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi lưu dữ liệu vào hệ thống.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-4xl grid grid-rows-[auto_1fr_auto] p-0 max-h-[90vh]">
      <DialogHeader className="p-6 pb-0">
        <DialogTitle>Nhập danh sách Đề tài từ Excel</DialogTitle>
        <DialogDescription>
          Chọn đợt báo cáo và tải lên tệp Excel để thêm hàng loạt đề tài. Tệp
          cần các cột:{" "}
          <b>title, field, summary, objectives, expectedResults, maxStudents</b>
          .
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 px-6 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Đợt báo cáo</label>
            <Select
              value={selectedSessionId}
              onValueChange={setSelectedSessionId}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Chọn một đợt báo cáo" />
              </SelectTrigger>
              <SelectContent>
                {availableSessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Tệp Excel</label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="mt-1 cursor-pointer"
            />
          </div>
        </div>
        {data.length > 0 ? (
          <div className="space-y-4">
            <Alert>
              <Rocket className="h-4 w-4" />
              <AlertTitle>Tệp đã sẵn sàng!</AlertTitle>
              <AlertDescription>
                Đã tải {data.length} bản ghi từ {fileName}. Xem trước dữ liệu
                bên dưới và nhấn "Nhập" để bắt đầu.
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
                  {data.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      {headers.map((header) => (
                        <TableCell key={header}>
                          {String(row[header] || "")}
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
        <Button variant="outline" onClick={onFinished} disabled={isImporting}>
          Hủy
        </Button>
        <Button
          onClick={handleImport}
          disabled={data.length === 0 || isImporting || !selectedSessionId}
        >
          {isImporting ? "Đang nhập..." : `Nhập ${data.length} đề tài`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
