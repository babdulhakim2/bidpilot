'use client';

import { useStore } from '@/lib/store';
import { Home, Search, FolderOpen, FileText, User } from 'lucide-react';

export default function BottomNav() {
  const { activeTab, setActiveTab, proposals } = useStore();
  
  const tabs = [
    { id: 'home' as const, icon: Home, label: 'Home' },
    { id: 'tenders' as const, icon: Search, label: 'Tenders' },
    { id: 'vault' as const, icon: FolderOpen, label: 'Vault' },
    { id: 'proposals' as const, icon: FileText, label: 'Proposals', badge: proposals.length },
    { id: 'profile' as const, icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition ${
                isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 right-0 w-5 h-5 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
