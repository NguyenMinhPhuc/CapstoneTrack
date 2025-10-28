
'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, GraduationCap, Briefcase } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Resource } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';


export function ResourceList() {
  const firestore = useFirestore();

  const resourcesCollectionRef = useMemoFirebase(
    () => collection(firestore, 'resources'),
    [firestore]
  );
  
  const { data: resources, isLoading } = useCollection<Resource>(resourcesCollectionRef);

  const { graduationResources, internshipResources } = useMemo(() => {
    if (!resources) return { graduationResources: [], internshipResources: [] };
    const graduation = resources.filter(r => r.category === 'graduation');
    const internship = resources.filter(r => r.category === 'internship');
    return { graduationResources: graduation, internshipResources: internship };
  }, [resources]);
  
  const ResourceTable = ({ resources }: { resources: Resource[] }) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">STT</TableHead>
              <TableHead>Tên tài liệu</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead className="text-right">Tải xuống</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.length > 0 ? (
              resources.map((resource, index) => (
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
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <a href={resource.link} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Tải
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Chưa có tài nguyên nào trong mục này.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );


  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="graduation" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="graduation">
            <GraduationCap className="mr-2 h-4 w-4"/>
            Tốt nghiệp ({graduationResources.length})
        </TabsTrigger>
        <TabsTrigger value="internship">
            <Briefcase className="mr-2 h-4 w-4"/>
            Thực tập ({internshipResources.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="graduation" className="mt-6">
        <ResourceTable resources={graduationResources} />
      </TabsContent>
      <TabsContent value="internship" className="mt-6">
        <ResourceTable resources={internshipResources} />
      </TabsContent>
    </Tabs>
  );
}
