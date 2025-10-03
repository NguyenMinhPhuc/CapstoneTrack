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
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, PlusCircle, Search, Upload, ListFilter, Shield, User, GraduationCap } from 'lucide-react';
import { useAuth, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { SystemUser } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { AddUserForm } from './add-user-form';
import { EditUserForm } from './edit-user-form';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Input } from './ui/input';
import { ImportUsersDialog } from './import-users-dialog';

const defaultAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar-default');

type RoleStats = {
    total: number;
    active: number;
    pending: number;
    disabled: number;
}

export function UserManagementTable() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isImportUserDialogOpen, setIsImportUserDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');


  const usersCollectionRef = useMemoFirebase(
    () => collection(firestore, 'users'),
    [firestore]
  );
  
  const { data: users, isLoading } = useCollection<SystemUser>(usersCollectionRef);

  const roleStats = useMemo(() => {
    const stats: Record<SystemUser['role'], RoleStats> = {
        admin: { total: 0, active: 0, pending: 0, disabled: 0 },
        supervisor: { total: 0, active: 0, pending: 0, disabled: 0 },
        student: { total: 0, active: 0, pending: 0, disabled: 0 },
    };

    if (!users) return stats;

    return users.reduce((acc, user) => {
        if (acc[user.role]) {
            acc[user.role].total++;
            acc[user.role][user.status]++;
        }
        return acc;
    }, stats);
  }, [users]);


  const filteredUsers = users?.filter(user => {
    const searchMatch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = roleFilter === 'all' || user.role === roleFilter;
    return searchMatch && roleMatch;
  });

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

  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Thành công',
        description: `Email đặt lại mật khẩu đã được gửi tới ${email}.`,
      });
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message || 'Không thể gửi email đặt lại mật khẩu.',
      });
    }
  };

  if (isLoading) {
    return (
        <div className="space-y-4">
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <Skeleton className="h-4 w-2/4" />
                           <Skeleton className="h-6 w-6 rounded-sm" />
                        </CardHeader>
                        <CardContent>
                           <Skeleton className="h-7 w-1/4 mb-2" />
                           <Skeleton className="h-4 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-4 w-2/4" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{roleStats.admin.total}</div>
                <p className="text-xs text-muted-foreground">
                    {roleStats.admin.active} active, {roleStats.admin.pending} pending, {roleStats.admin.disabled} disabled
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Supervisors</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{roleStats.supervisor.total}</div>
                 <p className="text-xs text-muted-foreground">
                    {roleStats.supervisor.active} active, {roleStats.supervisor.pending} pending, {roleStats.supervisor.disabled} disabled
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{roleStats.student.total}</div>
                 <p className="text-xs text-muted-foreground">
                    {roleStats.student.active} active, {roleStats.student.pending} pending, {roleStats.student.disabled} disabled
                </p>
            </CardContent>
        </Card>
    </div>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>User List</CardTitle>
                <CardDescription>
                Manage all users in the system.
                </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className="flex w-full sm:w-auto gap-2">
                  <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                          type="search"
                          placeholder="Search by email..."
                          className="pl-8 w-full sm:w-64"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                   <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1 text-sm">
                                <ListFilter className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only">Filter</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                             <DropdownMenuCheckboxItem
                                checked={roleFilter === 'all'}
                                onCheckedChange={() => setRoleFilter('all')}
                            >
                                All Roles
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={roleFilter === 'admin'}
                                onCheckedChange={() => setRoleFilter('admin')}
                            >
                                Admin
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={roleFilter === 'supervisor'}
                                onCheckedChange={() => setRoleFilter('supervisor')}
                            >
                                Supervisor
                            </DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem
                                checked={roleFilter === 'student'}
                                onCheckedChange={() => setRoleFilter('student')}
                            >
                                Student
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                    <Dialog open={isImportUserDialogOpen} onOpenChange={setIsImportUserDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                                <Upload className="mr-2 h-4 w-4" />
                                Import
                            </Button>
                        </DialogTrigger>
                        <ImportUsersDialog onFinished={() => setIsImportUserDialogOpen(false)} />
                    </Dialog>
                    <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full">
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
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map((user, index) => (
              <TableRow key={user.id}>
                <TableCell>{index + 1}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleResetPassword(user.email)}>
                        Reset Password
                      </DropdownMenuItem>
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
    </div>
  );
}
