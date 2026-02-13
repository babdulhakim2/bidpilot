'use client';

import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { formatNaira } from '@/lib/store';
import { 
  Send, Loader2, Sparkles, Check, X, ChevronRight, 
  AlertTriangle, Target, Calendar, MapPin, Building2, Save
} from 'lucide-react';

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

  const analyzeTender = useAction(api.analysis.matchTender.analyzeTenderText);
  const saveTender = useAction(api.analysis.matchTender.saveTenderFromAnalysis);
  const subscription = useQuery(api.billing.subscriptions.getMine);

  const canAnalyze = subscription?.usage && (
    subscription.usage.alertsLimit === -1 || 
    subscription.usage.alertsUsed < subscription.usage.alertsLimit
  );

  const handleAnalyze = async () => {
    if (!text.trim() || !canAnalyze) return;
    
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setSaved(false);

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

  const getMatchColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 bg-emerald-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Input Section */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">Analyze Any Tender</h3>
            <p className="text-sm text-gray-500 mb-3">
              Paste tender details and I'll match it to your company profile
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste tender announcement, requirements, or any procurement notice..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-sm"
              rows={4}
              disabled={analyzing}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-gray-400">
                {subscription?.usage && (
                  <span>
                    {subscription.usage.alertsUsed}/{subscription.usage.alertsLimit === -1 ? '∞' : subscription.usage.alertsLimit} alerts used
                  </span>
                )}
              </div>
              <button
                onClick={handleAnalyze}
                disabled={!text.trim() || analyzing || !canAnalyze}
                className="px-4 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Analyze
                  </>
                )}
              </button>
            </div>
            {!canAnalyze && (
              <p className="text-xs text-red-500 mt-2">
                You've used all your alerts this month. Upgrade to continue.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="border-t border-gray-100">
          {/* Header */}
          <div className="p-4 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-full font-bold text-sm ${getMatchColor(result.matchScore)}`}>
                <Target className="w-4 h-4 inline mr-1" />
                {result.matchScore}% Match
              </div>
              <span className="text-sm text-gray-500 capitalize">{result.category}</span>
            </div>
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
              {saved ? 'Saved!' : 'Save Tender'}
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
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
        </div>
      )}
    </div>
  );
}
