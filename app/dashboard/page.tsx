'use client';

import { useStore, formatNaira, daysUntil, getMatchColor } from '@/lib/store';
import TenderCard from '@/components/TenderCard';
import TenderDetail from '@/components/TenderDetail';
import UploadModal from '@/components/UploadModal';
import Toast from '@/components/Toast';
import BottomNav from '@/components/BottomNav';
import { 
  Bell, Target, Calendar, Wallet, Pin, FolderOpen, FileText, 
  Settings, CreditCard, HelpCircle, LogOut, Trash2, Upload,
  Check, Loader2, Send, Download, Package, File, ChevronRight,
  ClipboardList
} from 'lucide-react';

export default function Dashboard() {
  const { 
    activeTab, 
    tenders, 
    documents, 
    proposals, 
    profile,
    showTenderDetail,
    setShowUploadModal,
    deleteDocument,
  } = useStore();

  const savedTenders = tenders.filter(t => t.saved);
  const highMatchTenders = tenders.filter(t => t.matchScore >= 70);

  const getDocIcon = (type: string) => {
    switch(type) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-500" />;
      case 'zip': return <Package className="w-6 h-6 text-amber-500" />;
      default: return <File className="w-6 h-6 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Modals & Overlays */}
      {showTenderDetail && <TenderDetail />}
      <UploadModal />
      <Toast />

      {/* Top Nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
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
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center cursor-pointer hover:bg-primary-200 transition">
                <span className="text-sm font-semibold text-primary-700">
                  {profile.companyName.charAt(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* ========== HOME TAB ========== */}
        {activeTab === 'home' && (
          <>
            {/* Welcome */}
            <div className="mb-8">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
                Good morning, {profile.companyName.split(' ')[0]}
              </h1>
              <p className="text-gray-600 mt-1">
                You have {highMatchTenders.length} high-match opportunities this week
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'New Matches', value: tenders.length.toString(), sublabel: 'this week', icon: Target, color: 'bg-primary-50 text-primary-700' },
                { label: 'Deadlines', value: tenders.filter(t => daysUntil(t.deadline) <= 7).length.toString(), sublabel: 'this week', icon: Calendar, color: 'bg-amber-50 text-amber-700' },
                { label: 'Total Value', value: formatNaira(tenders.reduce((sum, t) => sum + t.budget, 0)), sublabel: 'matched', icon: Wallet, color: 'bg-emerald-50 text-emerald-700' },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={`rounded-2xl p-4 sm:p-5 ${stat.color}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium uppercase tracking-wider opacity-80 hidden sm:block">{stat.label}</span>
                    </div>
                    <div className="font-display text-xl sm:text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs opacity-70">{stat.sublabel}</div>
                  </div>
                );
              })}
            </div>

            {/* High-Match Opportunities */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Pin className="w-5 h-5 text-primary-600" /> High-Match Opportunities
                </h2>
                <button 
                  onClick={() => useStore.getState().setActiveTab('tenders')}
                  className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {highMatchTenders.slice(0, 3).map((tender) => (
                  <TenderCard key={tender.id} tender={tender} />
                ))}
              </div>
            </section>

            {/* Document Vault Summary */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary-600" /> Document Vault
                </h2>
                <button 
                  onClick={() => useStore.getState().setActiveTab('vault')}
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
                <div className="grid grid-cols-2 gap-3">
                  {documents.slice(0, 4).map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="text-2xl">{getDocIcon(doc.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{doc.name}</div>
                        <div className="text-xs text-gray-500">{doc.size}</div>
                      </div>
                      {doc.status === 'verified' ? (
                        <span className="w-6 h-6 flex items-center justify-center text-emerald-600 bg-emerald-50 rounded-full">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="w-6 h-6 flex items-center justify-center text-amber-600 bg-amber-50 rounded-full">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Recent Proposals */}
            {proposals.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-600" /> Recent Proposals
                </h2>
                <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
                  {proposals.slice(0, 3).map((proposal) => (
                    <div key={proposal.id} className="flex items-center gap-4 p-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        proposal.status === 'generated' ? 'bg-emerald-100 text-emerald-600' :
                        proposal.status === 'submitted' ? 'bg-primary-100 text-primary-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {proposal.status === 'generated' ? <Check className="w-5 h-5" /> : 
                         proposal.status === 'submitted' ? <Send className="w-5 h-5" /> : 
                         <FileText className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{proposal.tenderTitle}</div>
                        <div className="text-xs text-gray-500">{proposal.createdAt} • {proposal.sections.length} sections</div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        proposal.status === 'generated' ? 'bg-emerald-50 text-emerald-600' :
                        proposal.status === 'submitted' ? 'bg-primary-50 text-primary-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {proposal.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ========== TENDERS TAB ========== */}
        {activeTab === 'tenders' && (
          <>
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-gray-900">Browse Tenders</h1>
              <p className="text-gray-600 mt-1">{tenders.length} opportunities available</p>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 -mx-4 px-4">
              {['All', 'Construction', 'ICT', 'Consultancy', 'Supplies', 'Solar'].map((cat) => (
                <button 
                  key={cat}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    cat === 'All' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {tenders.map((tender) => (
                <TenderCard key={tender.id} tender={tender} />
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
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                    {getDocIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{doc.name}</div>
                    <div className="text-sm text-gray-500">{doc.category} • {doc.size} • {doc.uploadedAt}</div>
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
                    onClick={() => deleteDocument(doc.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Recommended Uploads */}
            <div className="mt-6 p-5 bg-amber-50 rounded-2xl border border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <ClipboardList className="w-5 h-5" /> Recommended Documents
              </h3>
              <div className="space-y-2">
                {['PENCOM Compliance Certificate', 'ITF Certificate', 'Audited Financial Statement'].map((doc) => (
                  <div key={doc} className="flex items-center justify-between p-3 bg-white rounded-xl">
                    <span className="text-sm text-gray-700">{doc}</span>
                    <button 
                      onClick={() => setShowUploadModal(true)}
                      className="px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600"
                    >
                      Upload
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
                <div className="flex justify-center mb-4">
                  <FileText className="w-12 h-12 text-gray-300" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">No proposals yet</h3>
                <p className="text-gray-500 mb-4">Generate your first proposal from a tender</p>
                <button 
                  onClick={() => useStore.getState().setActiveTab('tenders')}
                  className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700"
                >
                  Browse Tenders
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((proposal) => (
                  <div key={proposal.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{proposal.tenderTitle}</h3>
                        <p className="text-sm text-gray-500">Created {proposal.createdAt}</p>
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
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <p className="font-medium text-gray-900">{profile.phone}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Categories</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.categories.map((cat) => (
                      <span key={cat} className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button className="w-full p-4 bg-white rounded-xl border border-gray-200 text-left flex items-center gap-4 hover:bg-gray-50">
                <Settings className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-900">Account Settings</span>
              </button>
              <button className="w-full p-4 bg-white rounded-xl border border-gray-200 text-left flex items-center gap-4 hover:bg-gray-50">
                <Bell className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-900">Notifications</span>
              </button>
              <button className="w-full p-4 bg-white rounded-xl border border-gray-200 text-left flex items-center gap-4 hover:bg-gray-50">
                <CreditCard className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-900">Subscription</span>
              </button>
              <button className="w-full p-4 bg-white rounded-xl border border-gray-200 text-left flex items-center gap-4 hover:bg-gray-50">
                <HelpCircle className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-900">Help & Support</span>
              </button>
              <button className="w-full p-4 bg-red-50 rounded-xl border border-red-200 text-left flex items-center gap-4 hover:bg-red-100">
                <LogOut className="w-5 h-5 text-red-500" />
                <span className="font-medium text-red-600">Log Out</span>
              </button>
            </div>
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
