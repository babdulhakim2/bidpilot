'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCurrentUser } from '@/hooks/useUser';
import { useStore, formatNaira, daysUntil, toTitleCase } from '@/lib/store';
import { 
  Target, Calendar, Pin, FolderOpen, ChevronRight, Zap,
  Check, Loader2, AlertTriangle, ExternalLink
} from 'lucide-react';
import UploadModal from '@/components/UploadModal';
import TenderModal from '@/components/TenderModal';

export default function DashboardHome() {
  const { user, userId, isLoaded } = useCurrentUser();
  const { showUploadModal, setShowUploadModal, selectedTenderId, setSelectedTenderId } = useStore();

  // Fetch data
  const tenders = useQuery(api.tenders.list) ?? [];
  const documents = useQuery(api.documents.listByUser, userId ? { userId } : 'skip') ?? [];
  const subscription = useQuery(api.billing.subscriptions.getMine);

  const selectedTender = tenders.find((t: any) => t._id === selectedTenderId);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const profile = {
    companyName: user?.companyName ?? 'Your Company',
    completeness: user?.completeness ?? 25,
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'qualified': return 'bg-emerald-100 text-emerald-700';
      case 'partial': return 'bg-amber-100 text-amber-700';
      default: return 'bg-red-100 text-red-700';
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
          Good morning, {profile.companyName.split(' ')[0]}
        </h1>
        <p className="text-gray-600 mt-1">
          You have {tenders.filter((t: any) => (t.matchScore ?? 80) >= 70).length} high-match opportunities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-8">
        <div className="rounded-2xl p-3 sm:p-5 bg-primary-50 text-primary-700 overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-80 hidden sm:block">Matches</span>
          </div>
          <div className="font-display text-base sm:text-2xl font-bold">{tenders.length}</div>
          <div className="text-[10px] sm:text-xs opacity-70">available</div>
        </div>
        <div className="rounded-2xl p-3 sm:p-5 bg-amber-50 text-amber-700 overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-80 hidden sm:block">Deadlines</span>
          </div>
          <div className="font-display text-base sm:text-2xl font-bold">
            {tenders.filter((t: any) => daysUntil(t.deadline) <= 7).length}
          </div>
          <div className="text-[10px] sm:text-xs opacity-70">this week</div>
        </div>
      </div>

      {/* Usage Card */}
      {subscription && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-gray-900 capitalize">{subscription.plan} Plan</span>
            </div>
            <Link href="/billing" className="text-sm text-primary-600 font-medium hover:text-primary-700">
              {subscription.plan === 'free' ? 'Upgrade' : 'Manage'}
            </Link>
          </div>
          {subscription.usage && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Alerts</span>
                  <span className="text-xs font-medium text-gray-700">
                    {subscription.usage.alertsUsed}/{subscription.usage.alertsLimit === -1 ? '∞' : subscription.usage.alertsLimit}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      subscription.usage.alertsLimit !== -1 && subscription.usage.alertsUsed >= subscription.usage.alertsLimit 
                        ? 'bg-red-500' : 'bg-primary-500'
                    }`}
                    style={{ 
                      width: subscription.usage.alertsLimit === -1 
                        ? '10%' : `${Math.min(100, (subscription.usage.alertsUsed / subscription.usage.alertsLimit) * 100)}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Proposals</span>
                  <span className="text-xs font-medium text-gray-700">
                    {subscription.usage.proposalsUsed}/{subscription.usage.proposalsLimit === -1 ? '∞' : subscription.usage.proposalsLimit}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      subscription.usage.proposalsLimit !== -1 && subscription.usage.proposalsUsed >= subscription.usage.proposalsLimit 
                        ? 'bg-red-500' : 'bg-primary-500'
                    }`}
                    style={{ 
                      width: subscription.usage.proposalsLimit === -1 
                        ? '10%' : `${Math.min(100, (subscription.usage.proposalsUsed / subscription.usage.proposalsLimit) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          {subscription.plan !== 'free' && subscription.status === 'cancelled' && subscription.currentPeriodEnd && (
            <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Ends {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Top Opportunities */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2">
            <Pin className="w-5 h-5 text-primary-600" /> Top Opportunities
          </h2>
          <Link href="/dashboard/tenders" className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-3 sm:space-y-4 w-full">
          {tenders.slice(0, 3).map((tender: any) => (
            <div 
              key={tender._id}
              onClick={() => setSelectedTenderId(tender._id)}
              className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 active:bg-gray-50 transition-colors cursor-pointer touch-manipulation w-full min-w-0"
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(tender.status)}`}>
                  {tender.category}
                </span>
                {daysUntil(tender.deadline) > 0 && (
                  <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">{daysUntil(tender.deadline)}d left</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">{toTitleCase(tender.title)}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">{toTitleCase(tender.organization)}</p>
              {tender.source && (
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[10px] sm:text-xs text-gray-400">Source: {tender.source}</span>
                  {tender.sourceUrl && (
                    <a 
                      href={tender.sourceUrl} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between">
                {tender.budget > 0 ? (
                  <span className="font-display font-bold text-primary-600 text-sm sm:text-base">{formatNaira(tender.budget)}</span>
                ) : (
                  <span className="text-xs text-gray-400">Budget TBD</span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Document Vault Summary */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary-600" /> Document Vault
          </h2>
          <Link href="/dashboard/vault" className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1">
            Manage <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Profile Completeness</span>
                <span className="text-sm font-bold text-primary-600">{profile.completeness}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${profile.completeness}%` }}></div>
              </div>
            </div>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-primary-50 text-primary-600 text-sm font-semibold rounded-xl hover:bg-primary-100 transition"
            >
              Upload
            </button>
          </div>
          {documents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet</p>
          ) : (
            <p className="text-sm text-gray-600">{documents.length} documents uploaded</p>
          )}
        </div>
      </section>

      {/* Modals */}
      <UploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />
      {selectedTender && (
        <TenderModal 
          tender={selectedTender} 
          onClose={() => setSelectedTenderId(null)} 
        />
      )}
    </>
  );
}
