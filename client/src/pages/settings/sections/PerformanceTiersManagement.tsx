import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';

export default function PerformanceTiersManagement() {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Award className="h-5 w-5" />
          Performance Tiers Management
        </CardTitle>
        <CardDescription className="text-white/60">
          Manage salesperson performance tier options
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-white/70">Performance tiers management coming soon...</p>
      </CardContent>
    </Card>
  );
}