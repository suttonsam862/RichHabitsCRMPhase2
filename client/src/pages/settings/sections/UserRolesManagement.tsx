import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function UserRolesManagement() {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="h-5 w-5" />
          User Roles Management
        </CardTitle>
        <CardDescription className="text-white/60">
          Define system roles and their default permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-white/70">User roles management coming soon...</p>
      </CardContent>
    </Card>
  );
}