
'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, GraduationCap, Briefcase, Link as LinkIcon } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Resource } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ResourceList() {
  const firestore = useFirestore();

  const resourcesCollectionRef = useMemoFirebase(
    () => collection(firestore, 'resources'),
    [firestore]
  );
  
  const { data: resources, isLoading } = useCollection<Resource>(resourcesCollectionRef);

  const { graduationResources, internshipResources } = useMemo(() => {
    if (!resources) return { graduationResources: [], internshipResources: [] };
    const graduation = resources
      .filter(r => r.category === 'graduation')
      .sort((a, b) => a.name.localeCompare(b.name));
    const internship = resources
      .filter(r => r.category === 'internship')
      .sort((a, b) => a.name.localeCompare(b.name));
    return { graduationResources: graduation, internshipResources: internship };
  }, [resources]);
  
  const ResourceAccordion = ({ resources }: { resources: Resource[] }) => (
     <Accordion type="multiple" className="w-full space-y-2">
      {resources.length > 0 ? (
        resources.map((resource) => (
          <AccordionItem value={resource.id} key={resource.id} className="border rounded-md px-4 bg-card">
            <div className="flex items-center justify-between gap-4">
               <AccordionTrigger className="flex-1 text-left hover:no-underline">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-md">
                    {resource.category === 'graduation' ? (
                      <GraduationCap className="h-5 w-5 text-primary" />
                    ) : (
                      <Briefcase className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <span className="font-semibold">{resource.name}</span>
                </div>
              </AccordionTrigger>
              <div className="flex-shrink-0">
                {resource.links && resource.links.length === 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={resource.links[0].url} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      {resource.links[0].label || 'Tải'}
                    </a>
                  </Button>
                ) : resource.links && resource.links.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Tải xuống ({resource.links.length})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {resource.links.map((link, linkIndex) => (
                        <DropdownMenuItem key={linkIndex} asChild>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" />
                            <span>{link.label || `Link ${linkIndex + 1}`}</span>
                          </a>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>
            <AccordionContent>
              <div className={cn(
                  "prose prose-sm max-w-none text-muted-foreground pt-2 border-t mt-2", 
                  "[&_ul]:list-disc [&_ul]:pl-4", 
                  "[&_ol]:list-decimal [&_ol]:pl-4"
              )}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {resource.summary || 'Không có mô tả.'}
                </ReactMarkdown>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          Chưa có tài nguyên nào trong mục này.
        </div>
      )}
    </Accordion>
  );


  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
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
        <ResourceAccordion resources={graduationResources} />
      </TabsContent>
      <TabsContent value="internship" className="mt-6">
        <ResourceAccordion resources={internshipResources} />
      </TabsContent>
    </Tabs>
  );
}
