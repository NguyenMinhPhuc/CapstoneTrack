'use client';

import { useState } from 'react';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { SystemUser } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { AddUserForm } from './add-user-form';
import { EditUserForm } from './edit-user-form';
import { useToast } from '@/hooks/use-toast';

const defaultAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar-default');

export function UserManagementTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);


  const usersCollectionRef = useMemoFirebase(
    () => collection(firestore, 'users'),
    [firestore]
  );
  
  const { data: users, isLoading } = useCollection<SystemUser>(usersCollectionRef);

  const roleVariant: Record<SystemUser['role'], 'default' | 'secondary' | 'outline'> = {
    'admin': 'default',
    'supervisor': 'secondary',
    'student': 'outline'
  };

  const statusVariant: Record<SystemUser['status'], 'default' | 'secondary' | 'destructive'> = {
    'active': 'default',
    'pending': 'secondary',
    'disabled': 'destructive'
  };

  const statusLabel: Record<SystemUser['status'], string> = {
    'active': 'Đang hoạt động',
    'pending': 'Đang chờ',
    'disabled': 'Đã bị khóa'
  }
  
  const handleEditClick = (user: SystemUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleStatusChange = async (userId: string, newStatus: SystemUser['status']) => {
    const userDocRef = doc(firestore, 'users', userId);
    try {
      await updateDoc(userDocRef, { status: newStatus });
      toast({
        title: 'Thành công',
        description: `Trạng thái người dùng đã được cập nhật thành "${statusLabel[newStatus]}".`,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái người dùng.',
      });
    }
  };

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-4 w-2/4" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[250px]" />
                                <Skeleton className="h-4 w-[200px]" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>
            Manage all users in the system.
            </CardDescription>
        </div>
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogTrigger asChild>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Enter the details below to create a new user account.
              </DialogDescription>
            </DialogHeader>
            <AddUserForm onFinished={() => setIsAddUserDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        {defaultAvatar && (
                            <Image src={defaultAvatar.imageUrl} alt={user.email} width={40} height={40} data-ai-hint={defaultAvatar.imageHint}/>
                        )}
                      <AvatarFallback>{user.email.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{user.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleVariant[user.role]} className="capitalize">{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[user.status]}>{statusLabel[user.status]}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                    {user.createdAt?.toDate && format(user.createdAt.toDate(), 'PPP')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(user)}>Edit</DropdownMenuItem>
                       <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <span>Change Status</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'active')} disabled={user.status === 'active'}>
                              Activate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'pending')} disabled={user.status === 'pending'}>
                              Set to Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'disabled')} disabled={user.status === 'disabled'}>
                              Disable
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the user's details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <EditUserForm
              user={selectedUser}
              onFinished={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
