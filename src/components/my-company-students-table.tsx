"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type {
  DefenseRegistration,
  InternshipCompany,
  DefenseSession,
} from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

interface MyCompanyStudentsTableProps {
  supervisorId: string;
}

const registrationStatusLabel = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

const registrationStatusVariant: Record<
  string,
  "secondary" | "default" | "destructive"
> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const statusLabel: Record<string, string> = {
  ongoing: "Đang diễn ra",
  upcoming: "Sắp diễn ra",
  completed: "Đã hoàn thành",
};

export function MyCompanyStudentsTable({
  supervisorId,
}: MyCompanyStudentsTableProps) {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("all");

  // Get companies owned by this supervisor
  const companiesQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, "internshipCompanies"),
        where("ownerSupervisorId", "==", supervisorId)
      ),
    [firestore, supervisorId]
  );
  const { data: ownedCompanies, isLoading: isLoadingCompanies } =
    useCollection<InternshipCompany>(companiesQuery);

  // Get companies where supervisor manages a position
  const allCompaniesQuery = useMemoFirebase(
    () => collection(firestore, "internshipCompanies"),
    [firestore]
  );
  const { data: allCompanies } =
    useCollection<InternshipCompany>(allCompaniesQuery);

  // Find all companies where supervisor manages at least one position
  const managedCompanies = useMemo(() => {
    if (!allCompanies) return [];
    return allCompanies.filter((company) => {
      if (company.ownerSupervisorId === supervisorId) return true;
      if (!company.positions) return false;
      return company.positions.some((pos) => pos.supervisorId === supervisorId);
    });
  }, [allCompanies, supervisorId]);

  // Get all company names for filtering
  const companyNames = useMemo(() => {
    return managedCompanies.map((c) => c.name);
  }, [managedCompanies]);

  // Get registrations where student chose one of the managed companies or positions
  const registrationsQuery = useMemoFirebase(
    () =>
      companyNames.length > 0
        ? query(
            collection(firestore, "defenseRegistrations"),
            where("internship_companyName", "in", companyNames.slice(0, 30)) // Firestore limit
          )
        : null,
    [firestore, companyNames]
  );
  const { data: allRegistrations, isLoading: isLoadingRegistrations } =
    useCollection<DefenseRegistration>(registrationsQuery);

  // Filter registrations based on supervisor's management scope
  const filteredByScope = useMemo(() => {
    if (!allRegistrations || !managedCompanies) return [];

    return allRegistrations.filter((reg) => {
      const company = managedCompanies.find(
        (c) => c.name === reg.internship_companyName
      );
      if (!company) return false;

      // If supervisor owns the company, they see all students
      if (company.ownerSupervisorId === supervisorId) return true;

      // If supervisor manages a specific position, only show students in that position
      if (reg.internship_positionId && company.positions) {
        const position = company.positions.find(
          (p) => p.id === reg.internship_positionId
        );
        return position?.supervisorId === supervisorId;
      }

      return false;
    });
  }, [allRegistrations, managedCompanies, supervisorId]);

  // Get sessions
  const sessionsQuery = useMemoFirebase(
    () => collection(firestore, "graduationDefenseSessions"),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } =
    useCollection<DefenseSession>(sessionsQuery);

  const sessionMap = useMemo(() => {
    if (!sessions) return new Map();
    return new Map(sessions.map((s) => [s.id, s.name]));
  }, [sessions]);

  const groupedSessions = useMemo(() => {
    if (!sessions) return { ongoing: [], upcoming: [], completed: [] };
    return sessions.reduce((acc, session) => {
      const group = acc[session.status] || [];
      group.push(session);
      acc[session.status] = group;
      return acc;
    }, {} as Record<DefenseSession["status"], DefenseSession[]>);
  }, [sessions]);

  // Apply search and session filters
  const filteredRegistrations = useMemo(() => {
    let result = filteredByScope;

    if (selectedSessionId !== "all") {
      result = result.filter((reg) => reg.sessionId === selectedSessionId);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (reg) =>
          reg.studentName.toLowerCase().includes(term) ||
          reg.studentId.toLowerCase().includes(term) ||
          reg.internship_companyName?.toLowerCase().includes(term) ||
          reg.internship_positionTitle?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [filteredByScope, selectedSessionId, searchTerm]);

  const {
    items: paginatedRegistrations,
    state: pageState,
    next,
    prev,
  } = usePagination(filteredRegistrations, 50);

  const isLoading =
    isLoadingCompanies || isLoadingRegistrations || isLoadingSessions;

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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Sinh viên đăng ký thực tập</CardTitle>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm sinh viên, công ty..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={selectedSessionId}
              onValueChange={setSelectedSessionId}
            >
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Lọc theo đợt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả các đợt</SelectItem>
                {Object.entries(groupedSessions).map(
                  ([status, sessionList]) =>
                    sessionList.length > 0 && (
                      <SelectGroup key={status}>
                        <SelectLabel>
                          {statusLabel[status] || status}
                        </SelectLabel>
                        {sessionList.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">
          Danh sách sinh viên đăng ký vào các đơn vị hoặc vị trí bạn quản lý.
        </div>
        <div className="overflow-auto rounded-md border max-h-[65vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>STT</TableHead>
                <TableHead>Sinh viên</TableHead>
                <TableHead>MSSV</TableHead>
                <TableHead>Đơn vị</TableHead>
                <TableHead>Vị trí</TableHead>
                <TableHead>Đợt</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRegistrations.length > 0 ? (
                paginatedRegistrations.map((reg, index) => (
                  <TableRow key={reg.id}>
                    <TableCell>{pageState.startIndex + index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {reg.studentName}
                    </TableCell>
                    <TableCell>{reg.studentId}</TableCell>
                    <TableCell>{reg.internship_companyName || "—"}</TableCell>
                    <TableCell>
                      {reg.internship_positionTitle || "Chung"}
                    </TableCell>
                    <TableCell>{sessionMap.get(reg.sessionId)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          registrationStatusVariant[
                            reg.internshipRegistrationStatus || "pending"
                          ]
                        }
                      >
                        {
                          registrationStatusLabel[
                            reg.internshipRegistrationStatus || "pending"
                          ]
                        }
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Chưa có sinh viên nào đăng ký.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <PaginationControls state={pageState} onPrev={prev} onNext={next} />
        </div>
      </CardContent>
    </Card>
  );
}
