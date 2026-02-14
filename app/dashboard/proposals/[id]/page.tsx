'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import Link from 'next/link';
import { 
  ArrowLeft, Save, Loader2, Sparkles, Trash2, X,
  FileText, Clock, AlertCircle, Search, PenTool, ImageIcon, Download, Eye
} from 'lucide-react';
import SectionEditor, { ProposalSection } from '@/components/SectionEditor';
import ProposalPDF from '@/components/ProposalPDF';
import { downloadPDF, previewPDF } from '@/lib/generatePDF';
import { normalizeText } from '@/lib/textUtils';

export default function ProposalEditPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as Id<"proposals">;

  const proposal = useQuery(api.proposals.get, { id: proposalId });
  const tender = useQuery(
    api.tenders.get, 
    proposal?.tenderId ? { id: proposal.tenderId } : "skip"
  );
  const proposalImages = useQuery(api.proposalImages.listByProposal, { proposalId });
  const user = useQuery(api.users.me);
  
  const updateProposal = useMutation(api.proposals.update);
  const deleteProposal = useMutation(api.proposals.removeMine);
  const deleteImage = useMutation(api.proposalImages.deleteBySection);
  const runPipeline = useAction(api.proposalPipeline.runPipeline);
  const generateImage = useAction(api.proposalGenerate.generateSectionImage);
  
  const [sections, setSections] = useState<ProposalSection[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Get pipeline progress
  const progress = proposal?.pipelineProgress;
  const isPipelineRunning = progress && !['complete', 'error'].includes(progress.stage);

  // Initialize sections when proposal loads
  useEffect(() => {
    if (proposal?.content) {
      try {
        const data = JSON.parse(proposal.content);
        if (data.sections && Array.isArray(data.sections)) {
          // Merge images from proposalImages table
          const sectionsWithImages = data.sections.map((section: ProposalSection) => {
            const savedImage = proposalImages?.find((img: any) => img.sectionId === section.id);
            if (savedImage) {
              return {
                ...section,
                imageUrl: savedImage.url,
                imagePrompt: savedImage.prompt,
              };
            }
            return section;
          });
          setSections(sectionsWithImages);
        }
      } catch {
        setSections([{
          id: 'section-1',
          title: 'Proposal Content',
          content: proposal.content,
        }]);
      }
    }
  }, [proposal?.content, proposalImages]);

  // Update sections when pipeline completes
  useEffect(() => {
    if (progress?.stage === 'complete' && progress.sections) {
      // Merge with any images from the DB
      const sectionsWithImages = progress.sections.map((section: ProposalSection) => {
        const savedImage = proposalImages?.find((img: any) => img.sectionId === section.id);
        if (savedImage) {
          return {
            ...section,
            imageUrl: savedImage.url,
            imagePrompt: savedImage.prompt,
          };
        }
        return section;
      });
      setSections(sectionsWithImages);
    }
  }, [progress?.stage, progress?.sections, proposalImages]);

  const handleSave = async () => {
    if (!proposalId) return;
    setIsSaving(true);
    try {
      await updateProposal({
        id: proposalId,
        content: JSON.stringify({ sections }),
        sections: sections.map(s => s.title),
      });
      setLastSaved(new Date());
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!proposalId) return;
    setIsGenerating(true);
    try {
      await runPipeline({ proposalId });
    } catch (e: any) {
      console.error('Failed to generate:', e);
      alert(`Failed to generate proposal: ${e.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async (sectionId: string, sectionTitle: string, prompt: string, order: number): Promise<string | null> => {
    setGeneratingImageFor(sectionId);
    try {
      const result = await generateImage({ 
        proposalId,
        sectionId,
        sectionTitle,
        imagePrompt: prompt,
        order,
      });
      if (result.imageUrl) {
        setSections(prev => prev.map(s => 
          s.id === sectionId ? { ...s, imageUrl: result.imageUrl!, imagePrompt: prompt } : s
        ));
        return result.imageUrl;
      }
      if (result.error) {
        alert(result.error);
      }
      return null;
    } catch (e) {
      console.error('Failed to generate image:', e);
      return null;
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const handleRemoveImage = async (sectionId: string) => {
    try {
      await deleteImage({ proposalId, sectionId });
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, imageUrl: undefined } : s
      ));
    } catch (e) {
      console.error('Failed to remove image:', e);
    }
  };

  const handleDownloadPDF = async () => {
    if (!pdfRef.current || sections.length === 0) return;
    setIsGeneratingPDF(true);
    try {
      const filename = `${normalizeText(proposal?.tenderTitle || 'proposal').slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      await downloadPDF(pdfRef.current, filename);
    } catch (e) {
      console.error('Failed to generate PDF:', e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (!pdfRef.current || sections.length === 0) return;
    setIsGeneratingPDF(true);
    try {
      const url = await previewPDF(pdfRef.current);
      setPdfPreviewUrl(url);
    } catch (e) {
      console.error('Failed to preview PDF:', e);
      alert('Failed to generate preview. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProposal({ id: proposalId });
      router.push('/dashboard/proposals');
    } catch (e) {
      console.error('Failed to delete:', e);
      alert('Failed to delete proposal');
      setIsDeleting(false);
    }
  };

  // Auto-save
  useEffect(() => {
    if (sections.length === 0 || isPipelineRunning) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 30000);
    return () => clearTimeout(timer);
  }, [sections, isPipelineRunning]);

  if (!proposal) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
          <div className="w-32 h-10 bg-gray-200 rounded-xl" />
        </div>
        {/* Content skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex gap-2 mb-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-10 bg-gray-200 rounded-lg w-24" />
            ))}
          </div>
          <div className="flex gap-4">
            <div className="w-48 h-40 bg-gray-200 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/6" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    generated: 'bg-blue-100 text-blue-700',
    submitted: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link 
            href="/dashboard/proposals"
            className="p-1.5 hover:bg-gray-100 rounded-lg transition mt-0.5"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold text-gray-900 line-clamp-1">
              {normalizeText(proposal.tenderTitle)}
            </h1>
            {/* Meta row: status, timestamp, save, delete */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColors[proposal.status]}`}>
                {proposal.status}
              </span>
              {lastSaved && !isPipelineRunning && (
                <span className="text-xs text-gray-400">
                  {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {/* Save & Delete inline */}
              {sections.length > 0 && !isPipelineRunning && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-1 text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
                  title="Save"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </button>
              )}
              {!isPipelineRunning && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1 text-gray-400 hover:text-red-500 transition"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Tender meta */}
              {tender && sections.length > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs text-gray-500">{normalizeText(tender.organization)}</span>
                  {tender.budget > 0 && (
                    <span className="text-xs font-medium text-gray-600">₦{tender.budget.toLocaleString()}</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* PDF Generation Buttons - right side */}
        {sections.length > 0 && !isPipelineRunning && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handlePreviewPDF}
              disabled={isGeneratingPDF}
              className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition flex items-center gap-2 disabled:opacity-50"
              title="Preview PDF"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition flex items-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
            </button>
          </div>
        )}
        
        {/* Generate with AI - when no sections */}
        {sections.length === 0 && !isPipelineRunning && !isGenerating && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition flex items-center gap-2 disabled:opacity-50 flex-shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </button>
        )}
      </div>

      {/* Pipeline Progress - Simple */}
      {isPipelineRunning && progress && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-700">{progress.message}</p>
            <span className="text-sm font-medium text-primary-600">{progress.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {progress?.stage === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="font-semibold text-red-800">Generation Failed</h3>
          </div>
          <p className="text-red-700 mb-4">{progress.error || 'An error occurred'}</p>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* Content */}
      {!isPipelineRunning && sections.length > 0 ? (
        <SectionEditor
          sections={sections}
          onChange={setSections}
          onGenerateImage={handleGenerateImage}
          onRemoveImage={handleRemoveImage}
          isGeneratingImage={generatingImageFor}
        />
      ) : !isPipelineRunning && !progress?.error && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Sparkles className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-gray-900 mb-2">
            Ready to Generate Your Proposal
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Our AI pipeline will analyze your documents, research best practices, and generate a compelling proposal with images.
          </p>
          
          {/* Pipeline Preview */}
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            {[
              { icon: Search, label: 'Analyze', color: 'bg-blue-100 text-blue-600' },
              { icon: Search, label: 'Research', color: 'bg-purple-100 text-purple-600' },
              { icon: PenTool, label: 'Generate', color: 'bg-amber-100 text-amber-600' },
              { icon: ImageIcon, label: 'Images', color: 'bg-pink-100 text-pink-600' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${color}`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting Pipeline...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Proposal
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 mt-4">
            This usually takes 1-2 minutes
          </p>
        </div>
      )}

      {/* Hidden PDF Template */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <ProposalPDF
          ref={pdfRef}
          tenderTitle={normalizeText(proposal?.tenderTitle || 'Proposal')}
          organization={tender?.organization}
          companyName={user?.companyName}
          sections={sections}
          budget={tender?.budget}
          deadline={tender?.deadline}
        />
      </div>

      {/* PDF Preview Modal */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-lg text-gray-900">PDF Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button 
                  onClick={() => {
                    URL.revokeObjectURL(pdfPreviewUrl);
                    setPdfPreviewUrl(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full min-h-[70vh] rounded-lg border border-gray-300 bg-white"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-gray-900">Delete Proposal?</h3>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this proposal?
            </p>
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 mb-6 truncate">
              {normalizeText(proposal.tenderTitle)}
            </p>
            
            <p className="text-sm text-red-600 mb-6">
              ⚠️ This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
