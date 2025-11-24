"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Search, Trash2 } from "lucide-react";
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
} from "@/firebase";
import {
  collection,
  doc,
  deleteDoc,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import type { InternshipCompany } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AddCompanyForm } from "./add-company-form";
import { EditCompanyForm } from "./edit-company-form";
import { CompanyDetailsDialog } from "./company-details-dialog";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

interface MyCompanyManagementTableProps {
  supervisorId: string;
  supervisorName: string;
  isAdmin?: boolean;
}

export function MyCompanyManagementTable({
  supervisorId,
  supervisorName,
  isAdmin = false,
}: MyCompanyManagementTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] =
    useState<InternshipCompany | null>(null);
  const [companyToDelete, setCompanyToDelete] =
    useState<InternshipCompany | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Supervisors: only their companies. Admin: could view all but we keep same filter for simplicity unless extended later.
  const companiesQuery = useMemoFirebase(
    () =>
      isAdmin
        ? collection(firestore, "internshipCompanies")
        : query(
            collection(firestore, "internshipCompanies"),
            where("ownerSupervisorId", "==", supervisorId)
          ),
    [firestore, supervisorId, isAdmin]
  );
  const { data: companies, isLoading } =
    useCollection<InternshipCompany>(companiesQuery);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    const term = searchTerm.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.address && c.address.toLowerCase().includes(term))
    );
  }, [companies, searchTerm]);

  const {
    items: paginatedCompanies,
    state: pageState,
    next,
    prev,
  } = usePagination(filteredCompanies, 50);

  // Per-supervisor cap
  const MAX_OWNED_COMPANIES = 5;
  const ownedCount = useMemo(
    () =>
      companies
        ? companies.filter((c) => c.ownerSupervisorId === supervisorId).length
        : 0,
    [companies, supervisorId]
  );
  const reachedCap = !isAdmin && ownedCount >= MAX_OWNED_COMPANIES;

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
    const isOwner = (id: string) => {
      const c = companies?.find((x) => x.id === id);
      return c?.ownerSupervisorId === supervisorId;
    };
    if (selectedRowIds.length > 0) {
      selectedRowIds
        .filter(isOwner)
        .forEach((id) =>
          batch.delete(doc(firestore, "internshipCompanies", id))
        );
      count = selectedRowIds.filter(isOwner).length;
    } else if (companyToDelete && isOwner(companyToDelete.id)) {
      batch.delete(doc(firestore, "internshipCompanies", companyToDelete.id));
      count = 1;
    }
    if (count === 0) {
      setIsDeleteDialogOpen(false);
      return;
    }
    try {
      await batch.commit();
      toast({ title: "Thành công", description: `Đã xóa ${count} đơn vị.` });
    } catch (error) {
      const contextualError = new FirestorePermissionError({
        path: "batch delete internshipCompanies",
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
    if (checked === true)
      setSelectedRowIds(paginatedCompanies?.map((c) => c.id) || []);
    else setSelectedRowIds([]);
  };
  const handleRowSelect = (id: string, checked: boolean) => {
    if (checked) setSelectedRowIds((prev) => [...prev, id]);
    else setSelectedRowIds((prev) => prev.filter((r) => r !== id));
  };

  const isAllSelected =
    paginatedCompanies &&
    paginatedCompanies.length > 0 &&
    selectedRowIds.length === paginatedCompanies.length;
  const isSomeSelected =
    selectedRowIds.length > 0 &&
    selectedRowIds.length < (paginatedCompanies?.length || 0);

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
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Xóa (
                  {selectedRowIds.length})
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 md:grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm kiếm theo tên, địa chỉ..."
                  className="w-full pl-8 md:w-[220px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Dialog
                open={isAddDialogOpen}
                onOpenChange={(open) => {
                  if (!reachedCap) setIsAddDialogOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="w-full sm:w-auto"
                    disabled={reachedCap}
                    title={
                      reachedCap
                        ? `Đã đạt tối đa ${MAX_OWNED_COMPANIES} đơn vị`
                        : undefined
                    }
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Thêm Đơn vị
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <AddCompanyForm
                    onFinished={() => setIsAddDialogOpen(false)}
                    ownerSupervisorId={supervisorId}
                    ownerSupervisorName={supervisorName}
                    currentCount={ownedCount}
                    maxCount={MAX_OWNED_COMPANIES}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reachedCap && (
            <div className="mb-4 text-sm text-muted-foreground">
              Bạn đã tạo tối đa {MAX_OWNED_COMPANIES} đơn vị. Vui lòng xóa bớt
              nếu cần thêm.
            </div>
          )}
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
                <TableHead>Tên đơn vị</TableHead>
                <TableHead>Địa chỉ</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Vị trí / SV tiếp nhận</TableHead>
                <TableHead>Liên hệ</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCompanies && paginatedCompanies.length > 0 ? (
                paginatedCompanies.map((c) => (
                  <TableRow
                    key={c.id}
                    data-state={selectedRowIds.includes(c.id) && "selected"}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRowIds.includes(c.id)}
                        onCheckedChange={(checked) =>
                          handleRowSelect(c.id, !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.address || "—"}</TableCell>
                    <TableCell>
                      {c.website ? (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {c.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const positions = c.positions || [];
                        const count = positions.length;
                        const total = positions.reduce(
                          (sum, p) => sum + (p.quantity || 0),
                          0
                        );
                        return `${count} / ${total}`;
                      })()}
                    </TableCell>
                    <TableCell>
                      {c.contactEmail || c.contactPhone || c.contactName
                        ? [c.contactName, c.contactEmail, c.contactPhone]
                            .filter(Boolean)
                            .join(" / ")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(isAdmin ||
                            c.ownerSupervisorId === supervisorId) && (
                            <DropdownMenuItem
                              onClick={() => handleEditClick(c)}
                            >
                              Sửa
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDetailClick(c)}
                          >
                            Xem chi tiết
                          </DropdownMenuItem>
                          {(isAdmin ||
                            c.ownerSupervisorId === supervisorId) && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteClick(c)}
                            >
                              Xóa
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Chưa có đơn vị nào. Nhấn "Thêm Đơn vị" để bắt đầu.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <PaginationControls state={pageState} onPrev={prev} onNext={next} />
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          {selectedCompany && (
            <EditCompanyForm
              company={selectedCompany}
              onFinished={() => setIsEditDialogOpen(false)}
              readOnly={
                !(isAdmin || selectedCompany.ownerSupervisorId === supervisorId)
              }
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
            <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn{" "}
              {selectedRowIds.length > 0
                ? `${selectedRowIds.length} đơn vị đã chọn`
                : `đơn vị ${companyToDelete?.name}`}{" "}
              khỏi hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
