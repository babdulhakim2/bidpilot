import { create } from 'zustand';

// Simplified store - just UI state, data comes from Convex
interface AppState {
  // Modal states
  showUploadModal: boolean;
  setShowUploadModal: (show: boolean) => void;
  
  // Selected tender for detail view
  selectedTenderId: string | null;
  setSelectedTenderId: (id: string | null) => void;
  
  // Toasts
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useStore = create<AppState>()((set, get) => ({
  // Modal states
  showUploadModal: false,
  setShowUploadModal: (show) => set({ showUploadModal: show }),
  
  // Selected tender
  selectedTenderId: null,
  setSelectedTenderId: (id) => set({ selectedTenderId: id }),
  
  // Toasts
  toasts: [],
  addToast: (message, type) => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    setTimeout(() => get().removeToast(id), 4000);
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
}));

// Helper functions
export const formatNaira = (amount: number) => '₦' + amount.toLocaleString();

export const daysUntil = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const toTitleCase = (str: string) => {
  if (!str) return str;
  const upperCount = (str.match(/[A-Z]/g) || []).length;
  const letterCount = (str.match(/[a-zA-Z]/g) || []).length;
  if (letterCount > 0 && upperCount / letterCount > 0.6) {
    return str
      .toLowerCase()
      .replace(/(?:^|\s|[-/])\w/g, (match) => match.toUpperCase());
  }
  return str;
};
