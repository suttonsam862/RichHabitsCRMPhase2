
import { type Organization } from './api/organizations';

export function generateGradient(organization: Organization): string {
  const primary = organization.brandPrimary || '#3B82F6';
  const secondary = organization.brandSecondary || '#8B5CF6';
  
  return `linear-gradient(135deg, ${primary}, ${secondary})`;
}

export function generateGradientStops(organization: Organization): { from: string; to: string } {
  const primary = organization.brandPrimary || '#3B82F6';
  const secondary = organization.brandSecondary || '#8B5CF6';
  
  return {
    from: primary,
    to: secondary
  };
}

export function generateCardStyle(organization: Organization): React.CSSProperties {
  const gradient = generateGradient(organization);
  
  return {
    background: gradient,
    borderImage: gradient + ' 1',
    borderImageSlice: 1,
  };
}

export function generateTailwindGradient(organization: Organization): string {
  // Convert hex to Tailwind-compatible class names would require a lookup table
  // For now, return a CSS custom property approach
  const primary = organization.brandPrimary || '#3B82F6';
  const secondary = organization.brandSecondary || '#8B5CF6';
  
  return `bg-gradient-to-br from-[${primary}] to-[${secondary}]`;
}
