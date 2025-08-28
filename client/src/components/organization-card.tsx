
import { motion } from "framer-motion";
import { Building2, Users, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OrganizationWithSports } from "../../../shared/supabase-schema";

interface OrganizationCardProps {
  organization: OrganizationWithSports;
  onClick: () => void;
  gradientVariant?: 'default' | 'blue' | 'green' | 'orange';
  showSetupBadge?: boolean;
}

export function OrganizationCard({ 
  organization, 
  onClick, 
  gradientVariant = 'default',
  showSetupBadge = false
}: OrganizationCardProps) {
  const { name, logo_url, sports, universal_discounts, state, is_business, created_at } = organization;
  
  // Calculate discount percentage if available
  const discountInfo = universal_discounts as any;
  const discountPercent = discountInfo?.percentage || 0;

  const getCardClass = () => {
    switch (gradientVariant) {
      case 'blue': return 'neon-card-blue';
      case 'green': return 'neon-card-green';
      case 'orange': return 'neon-card-orange';
      default: return 'neon-card';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="flex-shrink-0 w-80"
    >
      <div 
        className={`${getCardClass()} cursor-pointer h-48 group relative overflow-hidden`}
        onClick={onClick}
        data-testid={`card-organization-${organization.id}`}
        style={organization.title_card_url ? {
          backgroundImage: `url(${organization.title_card_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {/* Logo overlay on gradient background */}
        {logo_url && !organization.title_card_url && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img 
              src={logo_url.startsWith('http') ? logo_url : `/api/organizations/${organization.id}/logo`}
              alt=""
              className="w-32 h-32 object-contain opacity-10"
              aria-hidden="true"
            />
          </div>
        )}
        
        {/* Overlay for readability when title card is present */}
        {organization.title_card_url && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        )}
        
        {/* Setup Needed Badge */}
        {showSetupBadge && (
          <div className="absolute top-4 right-4 z-20">
            <Badge className="bg-yellow-500/80 text-black font-semibold px-3 py-1 animate-pulse">
              SETUP NEEDED
            </Badge>
          </div>
        )}
        
        <div className="neon-card-inner h-full flex flex-col justify-between relative z-10">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {logo_url ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/20 shadow-lg">
                    {/* Semitransparent logo overlay against gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10" />
                    <img 
                      src={logo_url.startsWith('http') ? logo_url : `/api/organizations/${organization.id}/logo`} 
                      alt={`${name} logo`}
                      className="relative z-10 w-full h-full object-cover"
                      data-testid={`img-organization-logo-${organization.id}`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className = 'absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-lg font-bold text-white';
                        fallback.textContent = name.charAt(0);
                        e.currentTarget.parentElement?.appendChild(fallback);
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white/80" />
                  </div>
                )}
                
                {discountPercent > 0 && (
                  <Badge className="bg-gradient-to-r from-green-400/20 to-green-600/20 text-green-300 border border-green-500/30">
                    {discountPercent}% OFF
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 
                className="font-semibold text-xl text-white leading-tight line-clamp-2"
                data-testid={`text-organization-name-${organization.id}`}
              >
                {name}
              </h3>
              <div className="flex items-center gap-2">
                <Badge 
                  className={`${is_business ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'}`}
                  data-testid={`badge-org-type-${organization.id}`}
                >
                  {is_business ? 'Business' : 'School'}
                </Badge>
                <span className="text-white/60 text-sm">{state}</span>
              </div>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="flex items-center justify-between text-sm text-white/70">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span data-testid={`text-sports-count-${organization.id}`}>
                {sports.length} sport{sports.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-white/50 text-xs">
              <span data-testid={`text-created-date-${organization.id}`}>
                {new Date(created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Glow indicator on hover */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>
    </motion.div>
  );
}
