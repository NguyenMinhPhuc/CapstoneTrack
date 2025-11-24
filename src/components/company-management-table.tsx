"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  Users,
  Trash2,
  Upload,
  FileDown,
  CheckCircle,
} from "lucide-react";
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
} from "@/firebase";
import { collection, doc, deleteDoc, writeBatch } from "firebase/firestore";
import type { InternshipCompany } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { AddCompanyForm } from "./add-company-form";
import { EditCompanyForm } from "./edit-company-form";
import { CompanyDetailsDialog } from "./company-details-dialog";
import { Checkbox } from "./ui/checkbox";
import { AssignCompaniesToSessionDialog } from "./assign-companies-to-session-dialog";
import { ImportCompaniesDialog } from "./import-companies-dialog";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

export function CompanyManagementTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignToSessionDialogOpen, setIsAssignToSessionDialogOpen] =
    useState(false);
  const [companyToDelete, setCompanyToDelete] =
    useState<InternshipCompany | null>(null);
  const [selectedCompany, setSelectedCompany] =
    useState<InternshipCompany | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  const companiesCollectionRef = useMemoFirebase(
    () => collection(firestore, "internshipCompanies"),
    [firestore]
  );

  const { data: companies, isLoading } = useCollection<InternshipCompany>(
    companiesCollectionRef
  );

  useEffect(() => {
    setSelectedRowIds([]);
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    return companies.filter((company) => {
      const term = searchTerm.toLowerCase();
      return (
        company.name.toLowerCase().includes(term) ||
        (company.address && company.address.toLowerCase().includes(term))
      );
    });
  }, [companies, searchTerm]);
  const {
    items: paginatedCompanies,
    state: pageState,
    next,
    prev,
  } = usePagination(filteredCompanies, 50);

  const handleEditClick = (company: InternshipCompany) => {
    setSelectedCompany(company);
    setIsEditDialogOpen(true);
  };

  const handleDetailClick = (company: InternshipCompany) => {
    setSelectedCompany(company);
    setIsDetailDialogOpen(true);
  };

  const handleDeleteClick = (company: InternshipCompany) => {
    setCompanyToDelete(company);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    const batch = writeBatch(firestore);
    let count = 0;

    if (selectedRowIds.length > 0) {
      selectedRowIds.forEach((id) => {
        batch.delete(doc(firestore, "internshipCompanies", id));
      });
      count = selectedRowIds.length;
    } else if (companyToDelete) {
      batch.delete(doc(firestore, "internshipCompanies", companyToDelete.id));
      count = 1;
    }

    if (count === 0) return;

    try {
      await batch.commit();
      toast({
        title: "Thành công",
        description: `Đã xóa ${count} doanh nghiệp.`,
      });
    } catch (error) {
      const contextualError = new FirestorePermissionError({
        path: "batch delete on internshipCompanies",
        operation: "delete",
      });
      errorEmitter.emit("permission-error", contextualError);
    } finally {
      setIsDeleteDialogOpen(false);
      setCompanyToDelete(null);
      setSelectedRowIds([]);
    }
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedRowIds(paginatedCompanies?.map((c) => c.id) || []);
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRowIds((prev) => [...prev, id]);
    } else {
      setSelectedRowIds((prev) => prev.filter((rowId) => rowId !== id));
    }
  };

  const handleDialogFinished = () => {
    setIsAssignToSessionDialogOpen(false);
    setSelectedRowIds([]);
  };

  const handleExportTemplate = () => {
    const headers = [
      "name",
      "address",
      "website",
      "description",
      "contactName",
      "contactEmail",
      "contactPhone",
      "isLHU",
    ];
    const worksheet = XLSX.utils.json_to_sheet([{}], { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachDoanhNghiep");

    // Set column widths
    worksheet["!cols"] = headers.map(() => ({ wch: 30 }));

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "Template_DoanhNghiep.xlsx");
  };

  const isAllSelected =
    paginatedCompanies &&
    paginatedCompanies.length > 0 &&
    selectedRowIds.length === paginatedCompanies.length;
  const isSomeSelected =
    selectedRowIds.length > 0 &&
    selectedRowIds.length < (paginatedCompanies?.length ?? 0);

  const stats = useMemo(() => {
    if (!companies) return null;
    const totalCompanies = companies.length;
    const lhuCount = companies.filter((c) => c.isLHU).length;
    const externalCount = totalCompanies - lhuCount;
    const totalPositions = companies.reduce(
      (sum, c) => sum + (c.positions ? c.positions.length : 0),
      0
    );
    const totalCapacity = companies.reduce(
      (sum, c) =>
        sum +
        (c.positions
          ? c.positions.reduce(
              (inner, p) => inner + (p.quantity ? p.quantity : 0),
              0
            )
          : 0),
      0
    );
    return {
      totalCompanies,
      lhuCount,
      externalCount,
      totalPositions,
      totalCapacity,
    };
  }, [companies]);

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
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {selectedRowIds.length > 0 && (
                <>
                  <Dialog
                    open={isAssignToSessionDialogOpen}
                    onOpenChange={setIsAssignToSessionDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Users className="mr-2 h-4 w-4" />
                        Gán vào đợt ({selectedRowIds.length})
                      </Button>
                    </DialogTrigger>
                    <AssignCompaniesToSessionDialog
                      companyIds={selectedRowIds}
                      onFinished={handleDialogFinished}
                    />
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Xóa ({selectedRowIds.length})
                  </Button>
                </>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 md:grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm kiếm theo tên, địa chỉ..."
                  className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExportTemplate}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Xuất mẫu
                </Button>
                <Dialog
                  open={isImportDialogOpen}
                  onOpenChange={setIsImportDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Nhập từ Excel
                    </Button>
                  </DialogTrigger>
                  <ImportCompaniesDialog
                    onFinished={() => setIsImportDialogOpen(false)}
                  />
                </Dialog>
                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Thêm Doanh nghiệp
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <AddCompanyForm
                      onFinished={() => setIsAddDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="mb-4 text-sm font-medium">
              Tổng số doanh nghiệp: {stats.totalCompanies} (Ngoài:{" "}
              {stats.externalCount}, LHU: {stats.lhuCount}) • Tổng số vị trí /
              SV tiếp nhận: {stats.totalPositions} / {stats.totalCapacity}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      isAllSelected
                        ? true
                        : isSomeSelected
                        ? "indeterminate"
                        : false
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Tên Doanh nghiệp</TableHead>
                <TableHead>Địa chỉ</TableHead>
                <TableHead>Vị trí / SV tiếp nhận</TableHead>
                <TableHead>Phòng ban LHU</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCompanies?.map((company) => (
                <TableRow
                  key={company.id}
                  data-state={selectedRowIds.includes(company.id) && "selected"}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRowIds.includes(company.id)}
                      onCheckedChange={(checked) =>
                        handleRowSelect(company.id, !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.address}</TableCell>
                  <TableCell>
                    {(() => {
                      const positions = company.positions || [];
                      const count = positions.length;
                      const total = positions.reduce(
                        (sum, p) => sum + (p.quantity || 0),
                        0
                      );
                      return `${count} / ${total}`;
                    })()}
                  </TableCell>
                  <TableCell>
                    {company.isLHU && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditClick(company)}
                        >
                          Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDetailClick(company)}
                        >
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(company)}
                        >
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls state={pageState} onPrev={prev} onNext={next} />
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedCompany && (
            <EditCompanyForm
              company={selectedCompany}
              onFinished={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        {selectedCompany && <CompanyDetailsDialog company={selectedCompany} />}
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Thao tác này sẽ xóa vĩnh viễn
              thông tin của{" "}
              {selectedRowIds.length > 0
                ? `${selectedRowIds.length} doanh nghiệp đã chọn`
                : `doanh nghiệp ${companyToDelete?.name}`}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Tiếp tục
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
