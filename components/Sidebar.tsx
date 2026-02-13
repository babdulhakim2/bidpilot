'use client';

import { useStore } from '@/lib/store';
import { UserButton } from '@clerk/nextjs';
import { Home, Search, FolderOpen, FileText, User, Sparkles } from 'lucide-react';

export default function Sidebar() {
  const { activeTab, setActiveTab, proposals } = useStore();
  
  const tabs = [
    { id: 'home' as const, icon: Home, label: 'Dashboard' },
    { id: 'opportunities' as const, icon: Search, label: 'Find Opportunities' },
    { id: 'vault' as const, icon: FolderOpen, label: 'Document Vault' },
    { id: 'proposals' as const, icon: FileText, label: 'Proposals', badge: proposals.length },
    { id: 'profile' as const, icon: User, label: 'Profile' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg text-gray-900">BidPilot</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                isActive 
                  ? 'bg-primary-50 text-primary-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-sm">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-primary-600 text-white text-xs font-bold rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9"
              }
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">My Account</p>
            <p className="text-xs text-gray-500">Settings & Billing</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
