'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { 
  X, Zap, Check, Loader2, AlertCircle, ChevronRight
} from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₦20,000',
    priceNum: 20000,
    period: '/mo',
    features: ['15 analysis/mo', '3 proposals/mo', 'Document Vault'],
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₦50,000',
    priceNum: 50000,
    period: '/mo',
    features: ['50 analysis/mo', '10 proposals/mo', 'Match insights', 'Priority support'],
    highlight: true,
  },
];

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'proposals' | 'alerts' | 'documents' | 'general';
  currentUsage?: {
    used: number;
    limit: number;
  };
}

export default function UpgradeModal({ isOpen, onClose, reason = 'general', currentUsage }: UpgradeModalProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const subscription = useQuery(api.billing.subscriptions.getMine);

  if (!isOpen) return null;

  const getReasonText = () => {
    switch (reason) {
      case 'proposals':
        return currentUsage 
          ? `You've used all ${currentUsage.limit} proposal${currentUsage.limit > 1 ? 's' : ''} this month`
          : 'You need more proposals';
      case 'alerts':
        return currentUsage 
          ? `You've used all ${currentUsage.limit} alerts this month`
          : 'You need more tender alerts';
      case 'documents':
        return 'Upgrade to upload more documents';
      default:
        return 'Upgrade to unlock more features';
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user?.primaryEmailAddress?.emailAddress) {
      setError('Email address required');
      return;
    }

    setLoading(planId);
    setError(null);

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          email: user.primaryEmailAddress.emailAddress,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      // Redirect to Paystack checkout
      window.location.href = data.authorizationUrl;
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  };

  const currentPlan = subscription?.plan || 'free';

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-gray-900">Upgrade</h2>
            <p className="text-xs text-gray-500">{getReasonText()}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Plans - Side by side on mobile */}
          <div className="grid grid-cols-2 gap-3">
            {PLANS.map((plan) => {
              const isCurrentPlan = currentPlan === plan.id;
              const isUpgrade = !isCurrentPlan && (
                (currentPlan === 'free') || 
                (currentPlan === 'starter' && plan.id === 'pro')
              );
              
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl p-3 transition ${
                    plan.highlight
                      ? 'bg-primary-600 text-white ring-2 ring-primary-600'
                      : isCurrentPlan
                        ? 'bg-gray-50 border border-gray-200'
                        : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="mb-2">
                    <div className="flex items-center gap-1">
                      <p className={`font-semibold text-sm ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                        {plan.name}
                      </p>
                      {plan.highlight && !isCurrentPlan && (
                        <span className="px-1.5 py-0.5 bg-white/20 text-white text-[10px] font-medium rounded">
                          Best
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-display text-lg font-bold">{plan.price}</span>
                      <span className={`text-xs ${plan.highlight ? 'text-primary-200' : 'text-gray-400'}`}>{plan.period}</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-1 mb-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-1.5 text-xs">
                        <Check className={`w-3 h-3 flex-shrink-0 ${plan.highlight ? 'text-primary-200' : 'text-primary-600'}`} />
                        <span className={plan.highlight ? 'text-white/90' : 'text-gray-600'}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isUpgrade ? (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loading !== null}
                      className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 ${
                        plan.highlight
                          ? 'bg-white text-primary-600 hover:bg-gray-100'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {loading === plan.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-3 h-3" />
                          Upgrade
                        </>
                      )}
                    </button>
                  ) : isCurrentPlan ? (
                    <div className="w-full py-2 rounded-lg bg-gray-200 text-gray-500 text-xs font-medium text-center">
                      Current
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Free tier info */}
          {currentPlan === 'free' && (
            <p className="mt-3 text-xs text-gray-500 text-center">
              Free: 1 analysis, 1 proposal (lifetime)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
