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
    period: '/month',
    features: ['15 tender alerts/month', '3 AI proposals/month', 'Document Vault', 'Email support'],
    highlight: false,
    alerts: 15,
    proposals: 3,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₦50,000',
    priceNum: 50000,
    period: '/month',
    features: ['100 tender alerts/month', '10 AI proposals/month', 'Qualification matching', 'Priority support'],
    highlight: true,
    alerts: 100,
    proposals: 10,
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
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900">Upgrade Your Plan</h2>
            <p className="text-sm text-gray-500 mt-0.5">{getReasonText()}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Current Plan Badge */}
          {currentPlan !== 'free' && (
            <div className="mb-4 p-3 bg-primary-50 rounded-xl flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-600" />
              <span className="text-sm text-primary-700">
                Current plan: <span className="font-semibold capitalize">{currentPlan}</span>
              </span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Plans */}
          <div className="space-y-4">
            {PLANS.map((plan) => {
              const isCurrentPlan = currentPlan === plan.id;
              const isUpgrade = !isCurrentPlan && (
                (currentPlan === 'free') || 
                (currentPlan === 'starter' && plan.id === 'pro')
              );
              
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-5 transition ${
                    plan.highlight
                      ? 'bg-primary-600 text-white ring-2 ring-primary-600 ring-offset-2'
                      : isCurrentPlan
                        ? 'bg-gray-50 border-2 border-gray-200'
                        : 'bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                          {plan.name}
                        </p>
                        {isCurrentPlan && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
                            Current
                          </span>
                        )}
                        {plan.highlight && !isCurrentPlan && (
                          <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="font-display text-2xl font-bold">{plan.price}</span>
                        <span className={plan.highlight ? 'text-primary-200' : 'text-gray-500'}>{plan.period}</span>
                      </div>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-primary-200' : 'text-primary-600'}`} />
                        <span className={plan.highlight ? 'text-white/90' : 'text-gray-600'}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isUpgrade ? (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loading !== null}
                      className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                        plan.highlight
                          ? 'bg-white text-primary-600 hover:bg-gray-100'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {loading === plan.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Upgrade to {plan.name}
                        </>
                      )}
                    </button>
                  ) : isCurrentPlan ? (
                    <div className="w-full py-3 rounded-xl bg-gray-200 text-gray-500 font-medium text-center">
                      Your Current Plan
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Free tier info */}
          {currentPlan === 'free' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 text-center">
                You're on the <strong>Free Plan</strong> (5 alerts, 1 proposal/month)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
