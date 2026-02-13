'use client';

import { useState, useEffect } from 'react';
import { useAuth, UserButton } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCurrentUser } from '@/hooks/useUser';
import { useStore } from '@/lib/store';
import { Id } from '@/convex/_generated/dataModel';
import { 
  Bell, Target, Calendar, Wallet, Pin, FolderOpen, FileText, 
  Settings, CreditCard, HelpCircle, LogOut, Trash2, Upload,
  Check, Loader2, Send, Download, Package, File, ChevronRight,
  ClipboardList, Building2, MapPin, ExternalLink, Bookmark, Sparkles, X
} from 'lucide-react';
import UploadModal from '@/components/UploadModal';

// Helper functions
const formatNaira = (amount: number) => '₦' + amount.toLocaleString();
const daysUntil = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

// Normalize ALL CAPS text to Title Case
const toTitleCase = (str: string) => {
  if (!str) return str;
  // If mostly uppercase, convert to title case
  const upperCount = (str.match(/[A-Z]/g) || []).length;
  const letterCount = (str.match(/[a-zA-Z]/g) || []).length;
  if (letterCount > 0 && upperCount / letterCount > 0.6) {
    return str
      .toLowerCase()
      .replace(/(?:^|\s|[-/])\w/g, (match) => match.toUpperCase());
  }
  return str;
};

export default function Dashboard() {
  const { isSignedIn } = useAuth();
  const { user, userId, isLoaded } = useCurrentUser();
  const { activeTab, setActiveTab } = useStore();
  const [selectedTender, setSelectedTender] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: Id<"documents">; name: string } | null>(null);

  // Close modal when switching tabs
  useEffect(() => {
    setSelectedTender(null);
  }, [activeTab]);

  // Fetch data from Convex
  const tenders = useQuery(api.tenders.list) ?? [];
  const documents = useQuery(api.documents.listByUser, userId ? { userId } : 'skip') ?? [];
  const proposals = useQuery(api.proposals.listByUser, userId ? { userId } : 'skip') ?? [];

  // Mutations
  const createProposal = useMutation(api.proposals.create);
  const generateProposal = useMutation(api.proposals.generate);
  const deleteDocument = useMutation(api.documents.remove);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Filter tenders
  const filteredOpportunities = selectedCategory === 'All' 
    ? tenders 
    : tenders.filter((t: any) => t.category === selectedCategory);
  const highMatchOpportunities = tenders.filter((t: any) => (t.matchScore ?? 80) >= 70);

  // Profile data (from Convex user or defaults)
  const profile = {
    companyName: user?.companyName ?? 'Your Company',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    categories: user?.categories ?? [],
    completeness: user?.completeness ?? 25,
  };

  const getDocIcon = (type: string) => {
    switch(type) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-500" />;
      case 'zip': return <Package className="w-6 h-6 text-amber-500" />;
      default: return <File className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'qualified': return 'bg-emerald-100 text-emerald-700';
      case 'partial': return 'bg-amber-100 text-amber-700';
      default: return 'bg-red-100 text-red-700';
    }
  };

  const handleGenerateProposal = async (tender: any) => {
    if (!userId) return;
    try {
      const proposalId = await createProposal({
        userId,
        tenderId: tender._id,
        tenderTitle: tender.title,
      });
      await generateProposal({ id: proposalId });
      setActiveTab('proposals');
    } catch (error) {
      console.error('Failed to generate proposal:', error);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Tender Detail Modal */}
      {selectedTender && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 overflow-hidden"
          onClick={() => setSelectedTender(null)}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white pt-4 pb-2 px-6 border-b border-gray-100 z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-1 bg-gray-300 rounded-full" />
                <button 
                  onClick={() => setSelectedTender(null)}
                  className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 pt-4 pb-24 lg:pb-6">
              <div className="flex items-start justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedTender.status)}`}>
                  {selectedTender.status === 'qualified' ? '✓ Qualified' : 
                   selectedTender.status === 'partial' ? '⚠ Partial Match' : '✗ Low Match'}
                </span>
                {daysUntil(selectedTender.deadline) > 0 && (
                  <span className="text-sm text-gray-500">{daysUntil(selectedTender.deadline)} days left</span>
                )}
              </div>
              <h2 className="font-display text-xl font-bold text-gray-900 mb-2">{toTitleCase(selectedTender.title)}</h2>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <Building2 className="w-4 h-4" />
                <span className="text-sm">{toTitleCase(selectedTender.organization)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{selectedTender.location}</span>
              </div>
              {selectedTender.source && (
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm">Source: {selectedTender.source}</span>
                  {selectedTender.sourceUrl && (
                    <a 
                      href={selectedTender.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 underline"
                    >
                      View Original
                    </a>
                  )}
                </div>
              )}
              {selectedTender.budget > 0 && (
                <div className="font-display text-2xl font-bold text-primary-600 mb-4">
                  {formatNaira(selectedTender.budget)}
                </div>
              )}
              <p className="text-gray-600 mb-6">{selectedTender.description}</p>
              
              <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
              <div className="space-y-2 mb-6">
                {selectedTender.requirements.map((req: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-gray-700">{req}</span>
                  </div>
                ))}
                {selectedTender.missing?.map((miss: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-amber-400" />
                    <span className="text-sm text-amber-700">{miss} (missing)</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2">
                  <Bookmark className="w-4 h-4" /> Save
                </button>
                <button 
                  onClick={() => handleGenerateProposal(selectedTender)}
                  className="flex-1 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Generate Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* ========== HOME TAB ========== */}
        {activeTab === 'home' && (
          <>
            <div className="mb-8">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
                Good morning, {profile.companyName.split(' ')[0]}
              </h1>
              <p className="text-gray-600 mt-1">
                You have {highMatchOpportunities.length} high-match opportunities
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-8">
              {[
                { label: 'Matches', value: tenders.length.toString(), sublabel: 'available', icon: Target, color: 'bg-primary-50 text-primary-700' },
                { label: 'Deadlines', value: tenders.filter((t: any) => daysUntil(t.deadline) <= 7).length.toString(), sublabel: 'this week', icon: Calendar, color: 'bg-amber-50 text-amber-700' },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={`rounded-2xl p-3 sm:p-5 ${stat.color} overflow-hidden`}>
                    <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-80 hidden sm:block truncate">{stat.label}</span>
                    </div>
                    <div className="font-display text-base sm:text-2xl font-bold truncate">{stat.value}</div>
                    <div className="text-[10px] sm:text-xs opacity-70">{stat.sublabel}</div>
                  </div>
                );
              })}
            </div>

            {/* High-Match Opportunities */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Pin className="w-5 h-5 text-primary-600" /> Top Opportunities
                </h2>
                <button 
                  onClick={() => setActiveTab('tenders')}
                  className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 sm:space-y-4 w-full">
                {tenders.slice(0, 3).map((tender: any) => (
                  <div 
                    key={tender._id}
                    onClick={() => setSelectedTender(tender)}
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
                            href={tender.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
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
                <button 
                  onClick={() => setActiveTab('vault')}
                  className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1"
                >
                  Manage <ChevronRight className="w-4 h-4" />
                </button>
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
                    className="px-4 py-2 bg-primary-50 text-primary-600 text-sm font-semibold rounded-xl hover:bg-primary-100 transition flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" /> Upload
                  </button>
                </div>
                {documents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {documents.slice(0, 4).map((doc: any) => (
                      <div key={doc._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        {getDocIcon(doc.type)}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{doc.name}</div>
                          <div className="text-xs text-gray-500">{doc.size}</div>
                        </div>
                        {doc.status === 'verified' ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ========== TENDERS TAB ========== */}
        {activeTab === 'tenders' && (
          <>
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-gray-900">Browse Opportunities</h1>
              <p className="text-gray-600 mt-1">{tenders.length} opportunities available</p>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 -mx-4 px-4">
              {['All', 'Construction', 'ICT', 'Consultancy', 'Supplies', 'Healthcare'].map((cat) => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    cat === selectedCategory ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-3 sm:space-y-4 w-full">
              {filteredOpportunities.map((tender: any) => (
                <div 
                  key={tender._id}
                  onClick={() => setSelectedTender(tender)}
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
                          href={tender.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
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
          </>
        )}

        {/* ========== VAULT TAB ========== */}
        {activeTab === 'vault' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-gray-900">Document Vault</h1>
                <p className="text-gray-600 mt-1">{documents.length} documents uploaded</p>
              </div>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition shadow-lg shadow-primary-500/20 flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" /> Upload
              </button>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">Profile Completeness</span>
                <span className="font-bold text-primary-600">{profile.completeness}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500" style={{ width: `${profile.completeness}%` }}></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Upload more documents to improve your match score</p>
            </div>

            {/* Documents List */}
            {documents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No documents yet</h3>
                <p className="text-gray-500 mb-4">Upload your company documents to get started</p>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700"
                >
                  Upload Documents
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: any) => (
                  <div key={doc._id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      {getDocIcon(doc.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{doc.name}</div>
                      <div className="text-sm text-gray-500">{doc.category} • {doc.size}</div>
                    </div>
                    {doc.status === 'verified' ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Verified
                      </span>
                    ) : doc.status === 'processing' ? (
                      <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-medium rounded-full flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Processing
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full">Rejected</span>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ id: doc._id, name: doc.name });
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ========== PROPOSALS TAB ========== */}
        {activeTab === 'proposals' && (
          <>
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-gray-900">My Proposals</h1>
              <p className="text-gray-600 mt-1">{proposals.length} proposals created</p>
            </div>

            {proposals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No proposals yet</h3>
                <p className="text-gray-500 mb-4">Generate your first proposal from a tender</p>
                <button 
                  onClick={() => setActiveTab('tenders')}
                  className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700"
                >
                  Browse Opportunities
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((proposal: any) => (
                  <div key={proposal._id} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{proposal.tenderTitle}</h3>
                        <p className="text-sm text-gray-500">Created {new Date(proposal.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        proposal.status === 'generated' ? 'bg-emerald-100 text-emerald-700' :
                        proposal.status === 'submitted' ? 'bg-primary-100 text-primary-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {proposal.sections.map((section) => (
                        <span key={section} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                          {section}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button className="flex-1 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> Download PDF
                      </button>
                      <button className="flex-1 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" /> Submit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ========== PROFILE TAB ========== */}
        {activeTab === 'profile' && (
          <>
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-gray-900">Profile</h1>
            </div>

            {/* Company Info Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-600">
                    {profile.companyName.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-gray-900">{profile.companyName}</h2>
                  <p className="text-gray-500">{profile.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                {profile.phone && (
                  <div>
                    <label className="text-sm text-gray-500">Phone</label>
                    <p className="font-medium text-gray-900">{profile.phone}</p>
                  </div>
                )}
                {profile.categories.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-500">Business Categories</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile.categories.map((cat) => (
                        <span key={cat} className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full capitalize">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account Details Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                Account Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm text-gray-500">Company Name</p>
                    <p className="font-medium text-gray-900">{profile.companyName}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{profile.email || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{profile.phone || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-gray-500">Profile Completeness</p>
                    <p className="font-medium text-primary-600">{profile.completeness}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="space-y-3">
              <button className="w-full p-4 bg-white rounded-xl border border-gray-200 text-left flex items-center gap-4 hover:bg-gray-50">
                <CreditCard className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">Subscription</span>
                  <p className="text-sm text-gray-500">Free Plan</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)} 
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Document?</h3>
              <p className="text-gray-600 text-sm">
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteDocument({ id: deleteConfirm.id });
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
