
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
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Search } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { InternshipCompany } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { AddCompanyForm } from './add-company-form';
import { EditCompanyForm } from './edit-company-form';

export function CompanyManagementTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<InternshipCompany | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<InternshipCompany | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const companiesCollectionRef = useMemoFirebase(
    () => collection(firestore, 'internshipCompanies'),
    [firestore]
  );
  
  const { data: companies, isLoading } = useCollection<InternshipCompany>(companiesCollectionRef);

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    return companies.filter(company => {
      const term = searchTerm.toLowerCase();
      return company.name.toLowerCase().includes(term) ||
             (company.address && company.address.toLowerCase().includes(term));
    });
  }, [companies, searchTerm]);
  
  const handleEditClick = (company: InternshipCompany) => {
    setSelectedCompany(company);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteClick = (company: InternshipCompany) => {
    setCompanyToDelete(company);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    
    deleteDoc(doc(firestore, 'internshipCompanies', companyToDelete.id))
        .then(() => {
            toast({
                title: 'Thành công',
                description: `Đã xóa công ty "${companyToDelete.name}".`,
            });
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
              path: `internshipCompanies/${companyToDelete.id}`,
              operation: 'delete',
            });
            errorEmitter.emit('permission-error', contextualError);
        })
        .finally(() => {
            setIsDeleteDialogOpen(false);
            setCompanyToDelete(null);
        });
  };

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
    <div className="space-y-4">
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Thêm Doanh nghiệp
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                     <AddCompanyForm onFinished={() => setIsAddDialogOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">STT</TableHead>
              <TableHead>Tên Doanh nghiệp</TableHead>
              <TableHead>Địa chỉ</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Người liên hệ</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies?.map((company, index) => (
              <TableRow key={company.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.address}</TableCell>
                <TableCell>
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{company.website}</a>
                </TableCell>
                <TableCell>{company.contactName} ({company.contactPhone || 'N/A'})</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(company)}>Sửa</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(company)}>Xóa</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedCompany && (
            <EditCompanyForm
              company={selectedCompany}
              onFinished={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
                Hành động này không thể hoàn tác. Thao tác này sẽ xóa vĩnh viễn thông tin doanh nghiệp.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Tiếp tục</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
