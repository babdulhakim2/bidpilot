'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCurrentUser } from '@/hooks/useUser';
import { useStore, formatNaira, toTitleCase } from '@/lib/store';
import { 
  Target, Calendar, Pin, ChevronRight,
  Loader2, ExternalLink
} from 'lucide-react';
import { formatDeadline, getDeadlineBgColor, timeAgo } from '@/lib/timeUtils';
import { getCategoryLabel } from '@/lib/categories';
import TenderModal from '@/components/TenderModal';
import TenderInput from '@/components/TenderInput';

export default function DashboardHome() {
  const { user, isLoaded } = useCurrentUser();
  const { selectedTenderId, setSelectedTenderId } = useStore();

  // Fetch data
  const tenders = useQuery(api.tenders.list) ?? [];

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

  const daysUntil = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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

      {/* Tender Analysis Input */}
      <section className="mb-8">
        <TenderInput />
      </section>

      {/* Top Opportunities */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2">
            <Pin className="w-5 h-5 text-primary-600" /> Top Opportunities
          </h2>
          <Link href="/dashboard/contracts" className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1">
            Browse All <ChevronRight className="w-4 h-4" />
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
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category badge - brand green */}
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 flex-shrink-0">
                    {getCategoryLabel(tender.category) || toTitleCase(tender.category)}
                  </span>
                  {/* Time added */}
                  {tender._creationTime && (
                    <span className="text-[10px] sm:text-xs text-gray-400">
                      {timeAgo(tender._creationTime)}
                    </span>
                  )}
                </div>
                {/* Deadline badge with background */}
                <span className={`text-xs sm:text-sm font-medium flex-shrink-0 px-2 py-0.5 rounded-full ${getDeadlineBgColor(tender.deadline)}`}>
                  {formatDeadline(tender.deadline)}
                </span>
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

      {/* Tender Detail Modal */}
      {selectedTender && (
        <TenderModal 
          tender={selectedTender} 
          onClose={() => setSelectedTenderId(null)} 
        />
      )}
    </>
  );
}
