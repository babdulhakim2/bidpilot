'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, UserButton } from '@clerk/nextjs';
import { Home, Search, FolderOpen, FileText, User, Bell } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/tenders', icon: Search, label: 'Tenders' },
  { href: '/dashboard/vault', icon: FolderOpen, label: 'Vault' },
  { href: '/dashboard/proposals', icon: FileText, label: 'Proposals' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [isPending, startTransition] = useTransition();

  // Prefetch all nav routes on mount for instant navigation
  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  // Check if path matches (exact for /dashboard, startsWith for others)
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  // Smooth navigation handler
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (pathname !== href) {
      startTransition(() => {
        router.push(href);
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav - mobile/tablet only */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 lg:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="font-display font-bold text-lg text-gray-900 hidden sm:block">BidPilot</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col bg-white border-r border-gray-200 z-40">
        <div className="flex flex-col flex-1 min-h-0 pt-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="font-display font-bold text-xl text-gray-900">BidPilot</span>
          </div>
          
          {/* Nav Links */}
          <nav className="flex-1 px-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  prefetch={true}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-150 ${
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-primary-600' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          
          {/* User Section */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">Account</p>
                <p className="text-xs text-gray-500">Manage settings</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pb-24 lg:pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 lg:hidden safe-area-pb">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                prefetch={true}
                className={`flex flex-col items-center justify-center w-16 h-full transition-colors duration-150 ${
                  active ? 'text-primary-600' : 'text-gray-500'
                }`}
              >
                <Icon className={`w-6 h-6 ${active ? 'text-primary-600' : ''}`} />
                <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
