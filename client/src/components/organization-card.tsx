import { motion } from "framer-motion";
import { Building2, Users, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OrganizationWithSports } from "@shared/schema";

interface OrganizationCardProps {
  organization: OrganizationWithSports;
  onClick: () => void;
}

export function OrganizationCard({ organization, onClick }: OrganizationCardProps) {
  const { name, logoUrl, sports, universalDiscounts } = organization;
  
  // Calculate discount percentage if available
  const discountInfo = universalDiscounts as any;
  const discountPercent = discountInfo?.percentage || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="flex-shrink-0 w-80"
    >
      <Card 
        className="glass cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 h-48 relative overflow-hidden group"
        onClick={onClick}
        data-testid={`card-organization-${organization.id}`}
      >
        {/* Background Image with Blur Effect */}
        {logoUrl && (
          <div 
            className="absolute inset-0 org-card-bg group-hover:scale-110 transition-transform duration-500"
            style={{ backgroundImage: `url(${logoUrl})` }}
          />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        
        <CardContent className="relative z-10 p-6 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-background/50 shadow-lg">
                    <img 
                      src={logoUrl} 
                      alt={`${name} logo`}
                      className="w-full h-full object-cover"
                      data-testid={`img-organization-logo-${organization.id}`}
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full glass-strong flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                )}
                
                {discountPercent > 0 && (
                  <Badge variant="secondary" className="glass text-xs">
                    {discountPercent}% OFF
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 
                className="font-semibold text-lg text-foreground leading-tight line-clamp-2"
                data-testid={`text-organization-name-${organization.id}`}
              >
                {name}
              </h3>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span data-testid={`text-sports-count-${organization.id}`}>
                {sports.length} sport{sports.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <ShoppingBag className="h-4 w-4" />
              <span>View Details</span>
            </div>
          </div>

          {/* Hover Effect Indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </CardContent>
      </Card>
    </motion.div>
  );
}