'use client';

import { useState, useRef } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { formatNaira } from '@/lib/store';
import { 
  Send, Loader2, Plus, Check, X, ChevronRight, 
  AlertTriangle, Target, Calendar, MapPin, Building2, Save, Sparkles, Paperclip
} from 'lucide-react';
import UpgradeModal from './UpgradeModal';

interface AnalysisResult {
  title: string;
  organization: string;
  category: string;
  budget: number | null;
  deadline: string | null;
  location: string;
  description: string;
  requirements: string[];
  matchScore: number;
  matchReasons: string[];
  missingRequirements: string[];
  recommendations: string[];
  howToWin: string;
}

export default function TenderInput() {
  const [text, setText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeTender = useAction(api.analysis.matchTender.analyzeTenderText);
  const saveTender = useAction(api.analysis.matchTender.saveTenderFromAnalysis);
  const subscription = useQuery(api.billing.subscriptions.getMine);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const canAnalyze = subscription?.usage && (
    subscription.usage.analysisLimit === -1 || 
    (subscription.usage.analysisUsed ?? 0) < subscription.usage.analysisLimit
  );

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setSaved(false);
    setLimitReached(false);

    // Check if user has credits
    if (!canAnalyze) {
      // Show blurred fake result with upgrade prompt
      setLimitReached(true);
      setResult({
        title: "Sample Tender Title",
        organization: "Government Agency",
        category: "construction",
        budget: 50000000,
        deadline: "2026-03-15",
        location: "Lagos",
        description: "This analysis is locked. Upgrade to see full details.",
        requirements: ["Requirement 1", "Requirement 2"],
        matchScore: 78,
        matchReasons: ["Strong experience match", "Required certifications"],
        missingRequirements: ["Additional documentation needed"],
        recommendations: ["Submit early", "Review requirements"],
        howToWin: "Focus on your experience and competitive pricing.",
      });
      setAnalyzing(false);
      return;
    }

    try {
      const analysis = await analyzeTender({ text: text.trim() });
      setResult(analysis);
    } catch (e: any) {
      console.error('Analysis error:', e);
      setError(e.message || 'Failed to analyze tender');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    
    setSaving(true);
    try {
      await saveTender({
        analysis: {
          title: result.title,
          organization: result.organization,
          category: result.category,
          budget: result.budget,
          deadline: result.deadline,
          location: result.location,
          description: result.description,
          requirements: result.requirements,
          matchScore: result.matchScore,
          missingRequirements: result.missingRequirements,
        },
        sourceText: text,
      });
      setSaved(true);
      setText('');
      setTimeout(() => {
        setResult(null);
        setSaved(false);
      }, 2000);
    } catch (e: any) {
      setError(e.message || 'Failed to save tender');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && text.trim()) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const handleAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Store filename for display
    setAttachedFile(file.name);
    
    // Read text from PDF (basic extraction - content will be in text)
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setText(prev => prev ? `${prev}\n\n[Attached: ${file.name}]` : `[Attached: ${file.name}]`);
    };
    reader.readAsText(file);
    
    // Reset input
    e.target.value = '';
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    setText(prev => prev.replace(/\[Attached: .*?\]\n?\n?/g, '').trim());
  };

  const getMatchColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 bg-emerald-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-4">
      {/* Clean Input */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        {attachedFile && (
          <div className="px-3 pt-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
              <Paperclip className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700 truncate max-w-[200px]">{attachedFile}</span>
              <button 
                onClick={removeAttachment}
                className="p-0.5 hover:bg-gray-200 rounded"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          </div>
        )}
        <div className="p-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste tender details to analyze..."
            className="w-full resize-none outline-none border-none shadow-none ring-0 focus:ring-0 focus:outline-none focus:border-none focus:shadow-none text-sm text-gray-900 placeholder:text-gray-400 min-h-[44px] max-h-[200px] bg-transparent"
            rows={1}
            disabled={analyzing}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 200) + 'px';
            }}
          />
        </div>
        <div className="flex items-center justify-between px-3 pb-3">
          <button
            onClick={handleAttachment}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Attach file"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || analyzing}
            className={`p-2 rounded-full transition ${
              text.trim() && !analyzing
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {analyzing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden relative">
          {/* Header - always visible */}
          <div className="p-4 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-full font-bold text-sm ${getMatchColor(result.matchScore)}`}>
                <Target className="w-4 h-4 inline mr-1" />
                {result.matchScore}% Match
              </div>
              <span className="text-sm text-gray-500 capitalize">{result.category}</span>
            </div>
            {!limitReached && (
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition ${
                  saved 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                } disabled:opacity-50`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saved ? 'Saved!' : 'Save'}
              </button>
            )}
          </div>

          {/* Content - blurred if limit reached */}
          <div className={`p-4 space-y-4 ${limitReached ? 'blur-sm select-none' : ''}`}>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">{result.title}</h4>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {result.organization}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {result.location}
                </span>
                {result.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {result.deadline}
                  </span>
                )}
              </div>
              {result.budget && (
                <div className="font-display text-xl font-bold text-primary-600 mt-2">
                  {formatNaira(result.budget)}
                </div>
              )}
            </div>

            <p className="text-gray-600 text-sm">{result.description}</p>

            {/* Match Reasons */}
            {result.matchReasons.length > 0 && (
              <div>
                <h5 className="font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Why You Match
                </h5>
                <ul className="space-y-1">
                  {result.matchReasons.map((reason, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing Requirements */}
            {result.missingRequirements.length > 0 && (
              <div>
                <h5 className="font-semibold text-amber-700 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Gaps to Address
                </h5>
                <ul className="space-y-1">
                  {result.missingRequirements.map((req, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <X className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* How to Win */}
            {result.howToWin && (
              <div className="p-4 bg-primary-50 rounded-xl">
                <h5 className="font-semibold text-primary-700 mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> How to Win This
                </h5>
                <p className="text-sm text-primary-800">{result.howToWin}</p>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div>
                <h5 className="font-semibold text-gray-700 mb-2">Next Steps</h5>
                <ul className="space-y-1">
                  {result.recommendations.map((rec, i) => (
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

          {/* Upgrade overlay when limit reached */}
          {limitReached && (
            <div className="absolute inset-0 top-[60px] bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center p-6">
              <Sparkles className="w-10 h-10 text-primary-600 mb-3" />
              <p className="text-base font-semibold text-gray-900 text-center mb-1">
                See full analysis
              </p>
              <p className="text-sm text-gray-500 text-center mb-4">
                Unlock match insights & winning strategies
              </p>
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition"
              >
                Upgrade to See
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal 
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          reason="analysis"
        />
      )}
    </div>
  );
}
