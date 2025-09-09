import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export default function RegionsManagement() {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <MapPin className="h-5 w-5" />
          Regions Management
        </CardTitle>
        <CardDescription className="text-white/60">
          Configure which US states are available for salesperson region selection
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-white/70">Regions management coming soon...</p>
      </CardContent>
    </Card>
  );
}