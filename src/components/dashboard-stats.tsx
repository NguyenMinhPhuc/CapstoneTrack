import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, GraduationCap, UserCheck } from "lucide-react";

const stats = [
  {
    title: "Total Students",
    value: "1,254",
    icon: <Users className="h-6 w-6 text-muted-foreground" />,
    change: "+12% from last month",
  },
  {
    title: "Pending Applications",
    value: "82",
    icon: <FileText className="h-6 w-6 text-muted-foreground" />,
    change: "-5 since last week",
  },
  {
    title: "Active Supervisors",
    value: "45",
    icon: <UserCheck className="h-6 w-6 text-muted-foreground" />,
    change: "+3 new supervisors",
  },
  {
    title: "Graduated",
    value: "980",
    icon: <GraduationCap className="h-6 w-6 text-muted-foreground" />,
    change: "+210 this year",
  },
];

export function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

DashboardStats.Skeleton = function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
         <Card key={i}>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-2/4" />
            <Skeleton className="h-6 w-6 rounded-sm" />
         </CardHeader>
         <CardContent>
            <Skeleton className="h-7 w-1/4 mb-2" />
            <Skeleton className="h-3 w-3/4" />
         </CardContent>
       </Card>
      ))}
    </div>
  );
};
