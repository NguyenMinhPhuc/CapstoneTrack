
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
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { MoreHorizontal, PlusCircle, Search, Link as LinkIcon, Edit, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { Resource } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { AddResourceForm } from './add-resource-form';
import { EditResourceForm } from './edit-resource-form';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const categoryLabel: Record<Resource['category'], string> = {
  graduation: 'Tốt nghiệp',
  internship: 'Thực tập',
};

const categoryVariant: Record<Resource['category'], 'default' | 'secondary'> = {
  graduation: 'default',
  internship: 'secondary',
};

export function ResourceManagementTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const resourcesCollectionRef = useMemoFirebase(
    () => collection(firestore, 'resources'),
    [firestore]
  );
  
  const { data: resources, isLoading } = useCollection<Resource>(resourcesCollectionRef);
  
  const filteredResources = useMemo(() => {
    if (!resources) return [];
    return resources.filter(resource => {
      const term = searchTerm.toLowerCase();
      const categoryMatch = categoryFilter === 'all' || resource.category === categoryFilter;
      const searchMatch = resource.name.toLowerCase().includes(term) ||
             (resource.summary && resource.summary.toLowerCase().includes(term));
      return categoryMatch && searchMatch;
    });
  }, [resources, searchTerm, categoryFilter]);
  
  const handleEditClick = (resource: Resource) => {
    setSelectedResource(resource);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteClick = (resource: Resource) => {
    setResourceToDelete(resource);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!resourceToDelete) return;

    try {
        await deleteDoc(doc(firestore, 'resources', resourceToDelete.id));
        toast({
            title: 'Thành công',
            description: `Đã xóa tài nguyên: ${resourceToDelete.name}.`,
        });
    } catch (error) {
       const contextualError = new FirestorePermissionError({
          path: `resources/${resourceToDelete.id}`,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', contextualError);
    } finally {
      setIsDeleteDialogOpen(false);
      setResourceToDelete(null);
    }
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
            <div className="flex items-center gap-2">
                 <CardTitle>Danh sách Tài nguyên</CardTitle>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 md:grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm theo tên, mô tả..."
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Lọc theo loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="graduation">Tốt nghiệp</SelectItem>
                    <SelectItem value="internship">Thực tập</SelectItem>
                  </SelectContent>
                </Select>
                 <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Thêm Tài nguyên
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <AddResourceForm onFinished={() => setIsAddDialogOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">STT</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Phân loại</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResources?.map((resource, index) => (
              <TableRow key={resource.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{resource.name}</TableCell>
                <TableCell>
                    <div className={cn("prose prose-sm max-w-none text-muted-foreground", "[&_ul]:list-disc [&_ul]:pl-4", "[&_ol]:list-decimal [&_ol]:pl-4")}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {resource.summary || 'Không có mô tả.'}
                      </ReactMarkdown>
                    </div>
                </TableCell>
                <TableCell>
                    <Badge variant={categoryVariant[resource.category]}>
                        {categoryLabel[resource.category]}
                    </Badge>
                </TableCell>
                <TableCell>
                  <a href={resource.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      <LinkIcon className="h-4 w-4" />
                  </a>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(resource)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(resource)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa
                      </DropdownMenuItem>
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
          {selectedResource && (
            <EditResourceForm
              resource={selectedResource}
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
                Hành động này không thể hoàn tác. Thao tác này sẽ xóa vĩnh viễn tài nguyên "{resourceToDelete?.name}".
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
