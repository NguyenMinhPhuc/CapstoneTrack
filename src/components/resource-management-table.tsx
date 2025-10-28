
'use client';

import { useState, useMemo } from 'react';
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
import { MoreHorizontal, PlusCircle, Search, Link as LinkIcon, Edit, Trash2, GraduationCap, Briefcase } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';


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
        <Accordion type="multiple" className="w-full space-y-2">
            {filteredResources?.map((resource) => (
                <AccordionItem value={resource.id} key={resource.id} className="border rounded-md px-4 bg-card">
                    <div className="flex items-center justify-between gap-4">
                        <AccordionTrigger className="flex-1 text-left hover:no-underline py-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-muted rounded-md">
                                    {resource.category === 'graduation' ? (
                                    <GraduationCap className="h-5 w-5 text-primary" />
                                    ) : (
                                    <Briefcase className="h-5 w-5 text-primary" />
                                    )}
                                </div>
                                <div>
                                    <span className="font-semibold">{resource.name}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={categoryVariant[resource.category]}>
                                        {categoryLabel[resource.category]}
                                    </Badge>
                                    <Badge variant="outline">{resource.links.length} link</Badge>
                                    </div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <div className="flex-shrink-0">
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
                        </div>
                    </div>
                    <AccordionContent>
                        <div className="border-t pt-4">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Mô tả</h4>
                                     <div className={cn("prose prose-sm max-w-none text-muted-foreground", "[&_ul]:list-disc [&_ul]:pl-4", "[&_ol]:list-decimal [&_ol]:pl-4")}>
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {resource.summary || 'Không có mô tả.'}
                                      </ReactMarkdown>
                                    </div>
                                </div>
                                 <div>
                                    <h4 className="font-semibold mb-2">Links</h4>
                                     <div className="flex flex-col gap-2">
                                      {resource.links && resource.links.map((link, idx) => (
                                          <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                                              <LinkIcon className="h-3 w-3"/>
                                              <span className="font-medium">{link.label || `Link ${idx + 1}`}:</span>
                                              <span className="text-muted-foreground truncate">{link.url}</span>
                                          </a>
                                      ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
        {filteredResources?.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
                Không tìm thấy tài nguyên nào.
            </div>
        )}
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
