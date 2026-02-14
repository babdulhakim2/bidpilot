import { 
  Construction, Monitor, Users, Package, Sun, Briefcase,
  Wrench, Truck, GraduationCap, Heart, Shield, Fuel,
  Leaf, HandHeart, LucideIcon
} from 'lucide-react';

export interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const CATEGORIES: Category[] = [
  { id: 'construction', label: 'Construction', icon: Construction, description: 'Building, renovation, civil works' },
  { id: 'ict', label: 'ICT & Technology', icon: Monitor, description: 'Software, hardware, IT services' },
  { id: 'consultancy', label: 'Consultancy', icon: Users, description: 'Advisory, professional services' },
  { id: 'supplies', label: 'Supplies & Goods', icon: Package, description: 'Office supplies, equipment' },
  { id: 'energy', label: 'Energy & Solar', icon: Sun, description: 'Renewable energy, power systems' },
  { id: 'oil-gas', label: 'Oil & Gas', icon: Fuel, description: 'Petroleum, refinery, pipelines' },
  { id: 'professional', label: 'Professional Services', icon: Briefcase, description: 'Legal, accounting, HR' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, description: 'Repairs, facility management' },
  { id: 'logistics', label: 'Logistics & Transport', icon: Truck, description: 'Shipping, fleet, warehousing' },
  { id: 'education', label: 'Education & Training', icon: GraduationCap, description: 'Training programs, e-learning' },
  { id: 'healthcare', label: 'Healthcare', icon: Heart, description: 'Medical supplies, health services' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Physical security, cybersecurity' },
  { id: 'agriculture', label: 'Agriculture', icon: Leaf, description: 'Farming, agro-processing, irrigation' },
  { id: 'social', label: 'Social Services', icon: HandHeart, description: 'Welfare programs, community development' },
];

// Simple array for filters/profile - just the IDs
export const CATEGORY_IDS = CATEGORIES.map(c => c.id);

// Get label from ID
export function getCategoryLabel(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.label ?? id;
}

// Get icon from ID
export function getCategoryIcon(id: string): LucideIcon | null {
  return CATEGORIES.find(c => c.id === id)?.icon ?? null;
}
