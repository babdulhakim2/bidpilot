import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface Tender {
  id: string;
  title: string;
  organization: string;
  budget: number;
  deadline: string;
  category: string;
  matchScore: number;
  status: 'qualified' | 'partial' | 'low';
  requirements: string[];
  missing: string[];
  description: string;
  location: string;
  source: string;
  publishedAt: string;
  saved: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  status: 'verified' | 'processing' | 'rejected';
  uploadedAt: string;
  size: string;
  category: string;
}

export interface Proposal {
  id: string;
  tenderId: string;
  tenderTitle: string;
  status: 'draft' | 'generated' | 'submitted';
  createdAt: string;
  sections: string[];
}

export interface UserProfile {
  companyName: string;
  email: string;
  phone: string;
  categories: string[];
  completeness: number;
}

// Initial Mock Data
const mockTenders: Tender[] = [
  {
    id: '1',
    title: 'Supply of ICT Equipment',
    organization: 'Federal University of Technology, Owerri',
    budget: 25000000,
    deadline: '2026-02-18',
    category: 'ICT',
    matchScore: 95,
    status: 'qualified',
    requirements: ['CAC Certificate', 'Tax Clearance', '3 Past Contracts', 'Company Profile'],
    missing: [],
    description: 'Procurement of computers, servers, networking equipment for the ICT center.',
    location: 'Owerri, Imo State',
    source: 'publicprocurement.ng',
    publishedAt: '2026-02-10',
    saved: false,
  },
  {
    id: '2',
    title: 'Renovation of Staff Quarters',
    organization: 'Nigeria Maritime University, Delta',
    budget: 85000000,
    deadline: '2026-02-25',
    category: 'Construction',
    matchScore: 72,
    status: 'partial',
    requirements: ['CAC Certificate', 'Tax Clearance', 'PENCOM', 'Financial Statement'],
    missing: ['PENCOM Certificate'],
    description: 'Complete renovation of 24 staff quarters including electrical and plumbing works.',
    location: 'Okerenkoko, Delta State',
    source: 'publicprocurement.ng',
    publishedAt: '2026-02-08',
    saved: true,
  },
  {
    id: '3',
    title: 'Consultancy Services for IT Infrastructure',
    organization: 'Universal Service Provision Fund, Abuja',
    budget: 45000000,
    deadline: '2026-02-23',
    category: 'Consultancy',
    matchScore: 88,
    status: 'qualified',
    requirements: ['CAC Certificate', 'Company Profile', 'Past Experience'],
    missing: [],
    description: 'Consultancy for design and implementation of nationwide broadband infrastructure.',
    location: 'Abuja, FCT',
    source: 'publicprocurement.ng',
    publishedAt: '2026-02-09',
    saved: false,
  },
  {
    id: '4',
    title: 'Supply of Solar Equipment',
    organization: 'OXFAM Nigeria',
    budget: 15000000,
    deadline: '2026-02-27',
    category: 'Solar & Renewable',
    matchScore: 45,
    status: 'low',
    requirements: ['Solar Installation License', 'Past Contracts'],
    missing: ['Solar Installation License', 'Relevant Past Contracts'],
    description: 'Supply of solar panels, batteries, and inverters for rural health centers.',
    location: 'Multiple Locations',
    source: 'OXFAM Portal',
    publishedAt: '2026-02-11',
    saved: false,
  },
  {
    id: '5',
    title: 'Supply of Office Furniture',
    organization: 'Central Bank of Nigeria',
    budget: 35000000,
    deadline: '2026-03-05',
    category: 'Supplies',
    matchScore: 82,
    status: 'qualified',
    requirements: ['CAC Certificate', 'Tax Clearance', 'Company Profile'],
    missing: [],
    description: 'Supply of executive and standard office furniture for new regional office.',
    location: 'Lagos, Lagos State',
    source: 'CBN Portal',
    publishedAt: '2026-02-12',
    saved: false,
  },
];

const mockDocuments: Document[] = [
  { id: '1', name: 'CAC Certificate.pdf', type: 'pdf', status: 'verified', uploadedAt: '2026-02-01', size: '2.4 MB', category: 'Registration' },
  { id: '2', name: 'Tax Clearance 2025.pdf', type: 'pdf', status: 'verified', uploadedAt: '2026-02-01', size: '1.8 MB', category: 'Tax' },
  { id: '3', name: 'Company Profile.pdf', type: 'pdf', status: 'verified', uploadedAt: '2026-02-01', size: '5.2 MB', category: 'Profile' },
  { id: '4', name: 'Past Contracts.zip', type: 'zip', status: 'processing', uploadedAt: '2026-02-10', size: '15.6 MB', category: 'Experience' },
];

const mockProposals: Proposal[] = [
  { id: '1', tenderId: '1', tenderTitle: 'Supply of ICT Equipment - FUTO', status: 'draft', createdAt: '2026-02-12', sections: ['Cover Letter', 'Technical Proposal'] },
];

const mockProfile: UserProfile = {
  companyName: 'Apex Engineering Ltd',
  email: 'info@apexeng.com.ng',
  phone: '+234 801 234 5678',
  categories: ['Construction', 'ICT', 'Supplies', 'Consultancy'],
  completeness: 75,
};

// Mock Live Feed - simulates real-time contract stream
const mockLiveFeed: LiveFeedItem[] = [
  { id: 'live-1', title: 'Supply of Medical Equipment', organization: 'Federal Medical Centre, Lokoja', budget: 120000000, category: 'Healthcare', source: 'BPP Portal', timestamp: '2026-02-13T08:45:00Z', isNew: true },
  { id: 'live-2', title: 'Road Rehabilitation Project', organization: 'Kogi State Ministry of Works', budget: 450000000, category: 'Construction', source: 'State Tenders Board', timestamp: '2026-02-13T08:42:00Z', isNew: true },
  { id: 'live-3', title: 'IT Training Services', organization: 'NITDA', budget: 35000000, category: 'ICT', source: 'publicprocurement.ng', timestamp: '2026-02-13T08:38:00Z', isNew: true },
  { id: 'live-4', title: 'Supply of Agricultural Inputs', organization: 'Federal Ministry of Agriculture', budget: 85000000, category: 'Agriculture', source: 'BPP Portal', timestamp: '2026-02-13T08:30:00Z', isNew: false },
  { id: 'live-5', title: 'Security Services Contract', organization: 'CBN Abuja', budget: 200000000, category: 'Security', source: 'CBN Portal', timestamp: '2026-02-13T08:25:00Z', isNew: false },
  { id: 'live-6', title: 'Office Renovation Works', organization: 'NNPC Towers', budget: 180000000, category: 'Construction', source: 'NNPC Portal', timestamp: '2026-02-13T08:20:00Z', isNew: false },
  { id: 'live-7', title: 'Fleet Management System', organization: 'FRSC Headquarters', budget: 95000000, category: 'ICT', source: 'publicprocurement.ng', timestamp: '2026-02-13T08:15:00Z', isNew: false },
  { id: 'live-8', title: 'Supply of School Furniture', organization: 'Universal Basic Education Commission', budget: 250000000, category: 'Supplies', source: 'BPP Portal', timestamp: '2026-02-13T08:10:00Z', isNew: false },
  { id: 'live-9', title: 'Water Treatment Plant', organization: 'Lagos State Water Corp', budget: 750000000, category: 'Construction', source: 'Lagos Tenders', timestamp: '2026-02-13T08:05:00Z', isNew: false },
  { id: 'live-10', title: 'Consulting: Digital Transformation', organization: 'Galaxy Backbone', budget: 65000000, category: 'Consultancy', source: 'Galaxy Portal', timestamp: '2026-02-13T08:00:00Z', isNew: false },
];

// Live Feed Item (raw contracts as they come in)
export interface LiveFeedItem {
  id: string;
  title: string;
  organization: string;
  budget: number;
  category: string;
  source: string;
  timestamp: string;
  isNew: boolean;
}

// Store
interface AppState {
  // Data
  tenders: Tender[];
  documents: Document[];
  proposals: Proposal[];
  profile: UserProfile;
  liveFeed: LiveFeedItem[];
  
  // UI State
  activeTab: 'home' | 'tenders' | 'vault' | 'proposals' | 'profile';
  selectedTender: Tender | null;
  isGenerating: boolean;
  showTenderDetail: boolean;
  showUploadModal: boolean;
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
  
  // Actions
  setActiveTab: (tab: AppState['activeTab']) => void;
  selectTender: (tender: Tender | null) => void;
  toggleSaveTender: (id: string) => void;
  generateProposal: (tenderId: string) => Promise<void>;
  uploadDocument: (name: string, category: string) => void;
  deleteDocument: (id: string) => void;
  setShowTenderDetail: (show: boolean) => void;
  setShowUploadModal: (show: boolean) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  markLiveFeedSeen: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial Data
      tenders: mockTenders,
      documents: mockDocuments,
      proposals: mockProposals,
      profile: mockProfile,
      liveFeed: mockLiveFeed,
      
      // Initial UI State
      activeTab: 'home',
      selectedTender: null,
      isGenerating: false,
      showTenderDetail: false,
      showUploadModal: false,
      toasts: [],
      
      // Actions
      setActiveTab: (tab) => set({ activeTab: tab, showTenderDetail: false }),
      
      selectTender: (tender) => set({ selectedTender: tender, showTenderDetail: !!tender }),
      
      toggleSaveTender: (id) => set((state) => ({
        tenders: state.tenders.map(t => 
          t.id === id ? { ...t, saved: !t.saved } : t
        )
      })),
      
      generateProposal: async (tenderId) => {
        set({ isGenerating: true });
        
        // Simulate AI generation delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const tender = get().tenders.find(t => t.id === tenderId);
        if (!tender) {
          set({ isGenerating: false });
          return;
        }
        
        const newProposal: Proposal = {
          id: Date.now().toString(),
          tenderId,
          tenderTitle: tender.title,
          status: 'generated',
          createdAt: new Date().toISOString().split('T')[0],
          sections: ['Cover Letter', 'Technical Proposal', 'Company Profile', 'Past Experience'],
        };
        
        set((state) => ({
          proposals: [...state.proposals, newProposal],
          isGenerating: false,
        }));
        
        get().addToast(`Proposal generated for "${tender.title}"`, 'success');
      },
      
      uploadDocument: (name, category) => {
        const newDoc: Document = {
          id: Date.now().toString(),
          name,
          type: name.split('.').pop() || 'pdf',
          status: 'processing',
          uploadedAt: new Date().toISOString().split('T')[0],
          size: `${(Math.random() * 5 + 0.5).toFixed(1)} MB`,
          category,
        };
        
        set((state) => ({
          documents: [...state.documents, newDoc],
          showUploadModal: false,
        }));
        
        get().addToast(`"${name}" uploaded successfully`, 'success');
        
        // Simulate processing completing
        setTimeout(() => {
          set((state) => ({
            documents: state.documents.map(d => 
              d.id === newDoc.id ? { ...d, status: 'verified' } : d
            ),
            profile: { ...state.profile, completeness: Math.min(100, state.profile.completeness + 5) }
          }));
        }, 3000);
      },
      
      deleteDocument: (id) => set((state) => ({
        documents: state.documents.filter(d => d.id !== id)
      })),
      
      setShowTenderDetail: (show) => set({ showTenderDetail: show }),
      
      setShowUploadModal: (show) => set({ showUploadModal: show }),
      
      addToast: (message, type) => {
        const id = Date.now().toString();
        set((state) => ({
          toasts: [...state.toasts, { id, message, type }]
        }));
        // Auto remove after 4 seconds
        setTimeout(() => get().removeToast(id), 4000);
      },
      
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      })),
      
      markLiveFeedSeen: () => set((state) => ({
        liveFeed: state.liveFeed.map(item => ({ ...item, isNew: false }))
      })),
    }),
    {
      name: 'bidpilot-storage',
      partialize: (state) => ({ 
        tenders: state.tenders,
        documents: state.documents,
        proposals: state.proposals,
        profile: state.profile,
      }),
    }
  )
);

// Helper functions
export const formatNaira = (amount: number) => '₦' + amount.toLocaleString();

export const daysUntil = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const getMatchColor = (score: number) => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-400';
};

export const getMatchBg = (score: number) => {
  if (score >= 80) return 'bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
};
