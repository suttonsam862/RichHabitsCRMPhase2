import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function OrderStatusesManagement() {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <BarChart3 className="h-5 w-5" />
          Order Statuses Management
        </CardTitle>
        <CardDescription className="text-white/60">
          Configure order status workflow and progression
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-white/70">Order statuses management coming soon...</p>
      </CardContent>
    </Card>
  );
}