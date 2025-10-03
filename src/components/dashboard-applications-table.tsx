import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal } from "lucide-react";
import type { Application } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from 'next/image';

const applications: Application[] = [
  { id: '1', studentName: 'Olivia Martin', studentId: 'ST123', avatar: PlaceHolderImages.find(p => p.id === 'avatar1')?.imageUrl ?? '', projectTitle: 'AI in Healthcare', status: 'Approved', submissionDate: '2024-05-20' },
  { id: '2', studentName: 'Jackson Lee', studentId: 'ST124', avatar: PlaceHolderImages.find(p => p.id === 'avatar2')?.imageUrl ?? '', projectTitle: 'Quantum Computing Algo', status: 'Pending', submissionDate: '2024-05-22' },
  { id: '3', studentName: 'Isabella Nguyen', studentId: 'ST125', avatar: PlaceHolderImages.find(p => p.id === 'avatar3')?.imageUrl ?? '', projectTitle: 'Blockchain for Supply Chain', status: 'Pending', submissionDate: '2024-05-23' },
  { id: '4', studentName: 'William Kim', studentId: 'ST126', avatar: PlaceHolderImages.find(p => p.id === 'avatar4')?.imageUrl ?? '', projectTitle: 'Renewable Energy Solutions', status: 'Rejected', submissionDate: '2024-05-19' },
  { id: '5', studentName: 'Sophia Garcia', studentId: 'ST127', avatar: PlaceHolderImages.find(p => p.id === 'avatar5')?.imageUrl ?? '', projectTitle: 'Machine Learning for Finance', status: 'Approved', submissionDate: '2024-05-18' },
];

const statusVariant: Record<Application['status'], 'default' | 'secondary' | 'destructive'> = {
  'Approved': 'default',
  'Pending': 'secondary',
  'Rejected': 'destructive'
};

export function DashboardApplicationsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Applications</CardTitle>
        <CardDescription>
          Review and manage student internship and graduation applications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="hidden md:table-cell">Project Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <Image src={app.avatar} alt={app.studentName} width={32} height={32} data-ai-hint="person face" />
                      <AvatarFallback>{app.studentName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{app.studentName}</div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{app.projectTitle}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[app.status]}>{app.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Approve</DropdownMenuItem>
                      <DropdownMenuItem>Reject</DropdownMenuItem>
                      <DropdownMenuItem>Assign Supervisor</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
