'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCurrentUser } from '@/hooks/useUser';
import { formatNaira, toTitleCase } from '@/lib/store';
import { formatDeadline, getDeadlineBgColor } from '@/lib/timeUtils';
import { 
  X, Check, Building2, MapPin, ExternalLink, Bookmark, BookmarkCheck, Sparkles, Loader2,
  Target, AlertTriangle, ChevronRight, Lightbulb
} from 'lucide-react';
import UpgradeModal from './UpgradeModal';

interface TenderModalProps {
  tender: any;
  onClose: () => void;
}

interface MatchAnalysis {
  matchScore: number;
  matchReasons: string[];
  missingRequirements: string[];
  recommendations: string[];
  howToWin: string;
}

export default function TenderModal({ tender, onClose }: TenderModalProps) {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const createProposal = useMutation(api.proposals.createMine);
  const runPipeline = useAction(api.proposalPipeline.runPipeline);
  const analyzeTender = useAction(api.analysis.matchTender.analyzeTenderForUser);
  const saveTender = useMutation(api.tenders.saveTender);
  const unsaveTender = useMutation(api.tenders.unsaveTender);
  const subscription = useQuery(api.billing.subscriptions.getMine);
  const canUseProposal = useQuery(api.billing.subscriptions.canUse, { type: 'proposal' });
  
  const isSaved = tender.saved === true;

  const isPaid = subscription?.plan && subscription.plan !== 'free';

  // Auto-analyze for paid users
  useEffect(() => {
    if (isPaid && tender && !matchAnalysis && !analyzing) {
      handleAnalyze();
    }
  }, [isPaid, tender]);

  const handleAnalyze = async () => {
    if (!tender) return;
    setAnalyzing(true);
    try {
      const result = await analyzeTender({
        tenderTitle: tender.title,
        tenderDescription: tender.description,
        tenderRequirements: tender.requirements || [],
        tenderCategory: tender.category,
      });
      setMatchAnalysis(result);
    } catch (e) {
      console.error('Failed to analyze:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-100 text-emerald-700';
    if (score >= 50) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'qualified': return 'bg-emerald-100 text-emerald-700';
      case 'partial': return 'bg-amber-100 text-amber-700';
      default: return 'bg-red-100 text-red-700';
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      if (isSaved) {
        await unsaveTender({ tenderId: tender._id });
      } else {
        await saveTender({ tenderId: tender._id });
      }
    } catch (e) {
      console.error('Failed to save tender:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateProposal = async () => {
    if (!userId) {
      alert('Please sign in to generate proposals');
      return;
    }
    
    // Check if user can create more proposals - show upgrade modal if not
    if (canUseProposal && !canUseProposal.allowed) {
      setShowUpgradeModal(true);
      return;
    }
    
    setGenerating(true);
    try {
      // Create the proposal first (createMine gets user from auth)
      const proposalId = await createProposal({
        tenderId: tender._id,
        tenderTitle: tender.title,
      });
      
      console.log('[TenderModal] Created proposal:', proposalId);
      
      // Close modal first
      onClose();
      
      // Navigate to proposal page to show progress
      router.push(`/dashboard/proposals/${proposalId}`);
      
      // Start the pipeline in background (don't await - let it run)
      runPipeline({ proposalId })
        .then(() => console.log('[TenderModal] Pipeline complete'))
        .catch((e) => console.error('[TenderModal] Pipeline error:', e));
        
    } catch (error: any) {
      console.error('Failed to create proposal:', error);
      // Check if it's a limit error
      if (error.message?.includes('limit reached')) {
        setShowUpgradeModal(true);
      } else {
        alert(`Failed to create proposal: ${error.message || 'Unknown error'}`);
      }
      setGenerating(false);
    }
  };

  const displayScore = matchAnalysis?.matchScore ?? tender.matchScore ?? null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 overflow-hidden"
      onClick={onClose}
    >
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white pt-4 pb-2 px-6 border-b border-gray-100 z-10">
          <div className="flex items-center justify-between">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
            <button 
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 pt-4 pb-32 sm:pb-24 lg:pb-8">
          {/* Match Score Banner (for paid users) */}
          {isPaid && (
            <div className={`flex items-center justify-between p-4 rounded-2xl mb-4 ${displayScore !== null ? getScoreColor(displayScore) : 'bg-gray-100 text-gray-600'}`}>
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6" />
                <div>
                  {displayScore !== null ? (
                    <>
                      <div className="font-bold text-2xl">{displayScore}%</div>
                      <div className="text-sm opacity-80">Match Score</div>
                    </>
                  ) : analyzing ? (
                    <>
                      <div className="font-bold text-lg">Analyzing...</div>
                      <div className="text-sm opacity-80">Calculating match</div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-lg">—</div>
                      <div className="text-sm opacity-80">Match Score</div>
                    </>
                  )}
                </div>
              </div>
              {analyzing && <Loader2 className="w-5 h-5 animate-spin" />}
            </div>
          )}

          {/* Status for free users */}
          {!isPaid && (
            <div className="flex items-start justify-between mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(tender.status)}`}>
                {tender.status === 'qualified' ? '✓ Qualified' : 
                 tender.status === 'partial' ? '⚠ Partial Match' : '✗ Low Match'}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getDeadlineBgColor(tender.deadline)}`}>
                {formatDeadline(tender.deadline)}
              </span>
            </div>
          )}

          {/* Deadline for paid */}
          {isPaid && (
            <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-4 ${getDeadlineBgColor(tender.deadline)}`}>
              {formatDeadline(tender.deadline)}
            </span>
          )}
          
          <h2 className="font-display text-xl font-bold text-gray-900 mb-2">
            {toTitleCase(tender.title)}
          </h2>
          
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Building2 className="w-4 h-4" />
            <span className="text-sm">{toTitleCase(tender.organization)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{toTitleCase(tender.location)}</span>
          </div>
          
          {tender.source && (
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">{tender.source}</span>
              {tender.sourceUrl && (
                <a 
                  href={tender.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 underline"
                >
                  View Original
                </a>
              )}
            </div>
          )}
          
          {tender.budget > 0 && (
            <div className="font-display text-2xl font-bold text-primary-600 mb-4">
              {formatNaira(tender.budget)}
            </div>
          )}
          
          <p className="text-gray-600 mb-6">{toTitleCase(tender.description)}</p>

          {/* Match Analysis (Paid Users) */}
          {isPaid && matchAnalysis && (
            <div className="space-y-4 mb-6">
              {/* Why You Match */}
              {matchAnalysis.matchReasons.length > 0 && (
                <div>
                  <h3 className="font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Why You Match
                  </h3>
                  <ul className="space-y-1">
                    {matchAnalysis.matchReasons.map((reason, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Gaps to Address */}
              {matchAnalysis.missingRequirements.length > 0 && (
                <div>
                  <h3 className="font-semibold text-amber-700 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Gaps to Address
                  </h3>
                  <ul className="space-y-1">
                    {matchAnalysis.missingRequirements.map((req, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2 bg-amber-50 p-2 rounded-lg">
                        <X className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* How to Win */}
              {matchAnalysis.howToWin && (
                <div className="p-4 bg-primary-50 rounded-xl">
                  <h3 className="font-semibold text-primary-700 mb-2 flex items-center gap-1">
                    <Lightbulb className="w-4 h-4" /> How to Win
                  </h3>
                  <p className="text-sm text-primary-800">{matchAnalysis.howToWin}</p>
                </div>
              )}

              {/* Next Steps */}
              {matchAnalysis.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Next Steps</h3>
                  <ul className="space-y-1">
                    {matchAnalysis.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Blurred Preview for Free Users - shows what they're missing */}
          {!isPaid && (
            <div className="relative mb-6 rounded-xl overflow-hidden">
              {/* Blurred fake content */}
              <div className="blur-sm select-none pointer-events-none p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-700 font-bold">78%</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Match Score</div>
                    <div className="text-xs text-gray-500">Based on your profile</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-gray-700">Strong experience in similar projects</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-gray-700">Required certifications verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-gray-700">May need additional team members</span>
                  </div>
                </div>
              </div>
              {/* Upgrade overlay */}
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
                <Sparkles className="w-8 h-8 text-primary-600 mb-2" />
                <p className="text-sm font-medium text-gray-900 text-center mb-3">
                  See your match score & winning strategy
                </p>
                <button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition"
                >
                  Upgrade to Unlock
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={handleSave}
              disabled={saving}
              className={`flex-1 py-3 font-semibold rounded-xl transition flex items-center justify-center gap-2 ${
                isSaved 
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSaved ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              {isSaved ? 'Saved' : 'Save'}
            </button>
            <button 
              onClick={handleGenerateProposal}
              disabled={generating}
              className="flex-1 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generating ? 'Generating...' : 'Generate Proposal'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="proposals"
        currentUsage={canUseProposal ? { used: canUseProposal.used || 0, limit: canUseProposal.limit || 0 } : undefined}
      />
    </div>
  );
}
