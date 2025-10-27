
'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, GraduationCap, Briefcase } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Resource } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  
  const ResourceCard = ({ resource }: { resource: Resource }) => (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>{resource.name}</CardTitle>
          <CardDescription>{resource.summary || 'Không có mô tả.'}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {/* Can add more details here if needed */}
      </CardContent>
      <CardFooter>
        <a href={resource.link} target="_blank" rel="noopener noreferrer" className="w-full">
            <Button className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Tải xuống
            </Button>
        </a>
      </CardFooter>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
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
        {graduationResources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {graduationResources.map(resource => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Chưa có tài nguyên nào cho mục tốt nghiệp.</p>
        )}
      </TabsContent>
      <TabsContent value="internship" className="mt-6">
        {internshipResources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {internshipResources.map(resource => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Chưa có tài nguyên nào cho mục thực tập.</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
