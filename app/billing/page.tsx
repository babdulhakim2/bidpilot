'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Link from 'next/link';
import {
  ArrowLeft, Check, Loader2, CreditCard, Zap, Clock,
  AlertCircle, CheckCircle2, Receipt, ChevronRight
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
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₦50,000',
    priceNum: 50000,
    period: '/month',
    features: ['100 tender alerts/month', '10 AI proposals/month', 'Qualification matching', 'Priority support'],
    highlight: true,
  },
];

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Get subscription data
  const subscription = useQuery(api.billing.subscriptions.getMine);
  const transactions = useQuery(api.billing.subscriptions.getTransactions, { limit: 10 });
  const cancelSubscription = useMutation(api.billing.subscriptions.cancel);

  // Check for payment success
  useEffect(() => {
    const payment = searchParams.get('payment');
    // Paystack appends 'reference' or 'trxref' to callback URL
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    
    if (payment === 'success' && reference) {
      verifyPayment(reference);
    }
  }, [searchParams]);

  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);

  const verifyPayment = async (reference: string) => {
    setVerifying(true);
    try {
      const res = await fetch('/api/billing/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });
      
      if (res.ok) {
        // Payment verified - show success and refresh data
        setSuccess(true);
        setTimeout(() => {
          router.replace('/billing');
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Payment verification failed');
      }
    } catch (e) {
      console.error('Payment verification error:', e);
      setError('Failed to verify payment');
    } finally {
      setVerifying(false);
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

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelSubscription();
      setShowCancelModal(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        <p className="text-gray-500 mb-8">Manage your plan and payment methods</p>

        {verifying && (
          <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-xl flex items-center gap-3 text-primary-700">
            <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
            <p>Verifying payment...</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p><strong>Payment successful!</strong> Your subscription is now active.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Current Plan */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Current Plan</h2>
          
          {subscription === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          ) : subscription?.plan === 'free' ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-xl font-bold text-gray-900">Free Plan</p>
                <p className="text-gray-500">5 alerts, 1 proposal per month</p>
              </div>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                Free
              </span>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-display text-xl font-bold text-gray-900 capitalize">
                    {subscription?.plan} Plan
                  </p>
                  <p className="text-gray-500">
                    {formatAmount(subscription?.amountNaira || 0)}/month
                  </p>
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  subscription?.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {subscription?.status}
                </span>
              </div>
              
              {subscription?.currentPeriodEnd && (
                <p className="text-sm text-gray-500 mb-4">
                  {subscription?.status === 'active' 
                    ? `Renews on ${formatDate(subscription.currentPeriodEnd)}`
                    : `Access until ${formatDate(subscription.currentPeriodEnd)}`
                  }
                </p>
              )}

              {subscription?.status === 'active' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Cancel subscription
                </button>
              )}
              
              {subscription?.status === 'cancelled' && subscription?.currentPeriodEnd && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800">
                    <strong>Subscription cancelled.</strong> You'll have access until {formatDate(subscription.currentPeriodEnd)}.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Usage */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Usage This Month</h2>
          
          {subscription?.usage ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Tender Alerts</span>
                  <span className="text-sm font-medium text-gray-900">
                    {subscription.usage.alertsUsed} / {subscription.usage.alertsLimit === -1 ? '∞' : subscription.usage.alertsLimit}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ 
                      width: subscription.usage.alertsLimit === -1 
                        ? '10%' 
                        : `${Math.min(100, (subscription.usage.alertsUsed / subscription.usage.alertsLimit) * 100)}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">AI Proposals</span>
                  <span className="text-sm font-medium text-gray-900">
                    {subscription.usage.proposalsUsed} / {subscription.usage.proposalsLimit === -1 ? '∞' : subscription.usage.proposalsLimit}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ 
                      width: subscription.usage.proposalsLimit === -1 
                        ? '10%' 
                        : `${Math.min(100, (subscription.usage.proposalsUsed / subscription.usage.proposalsLimit) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}
        </section>

        {/* Plans */}
        {(!subscription || subscription.plan === 'free') && (
          <section className="mb-8">
            <h2 className="font-semibold text-gray-900 mb-4">Upgrade Your Plan</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-6 ${
                    plan.highlight
                      ? 'bg-primary-600 text-white ring-2 ring-primary-600 ring-offset-2'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="mb-4">
                    <p className={`text-sm font-semibold mb-1 ${plan.highlight ? 'text-primary-200' : 'text-primary-600'}`}>
                      {plan.name}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold">{plan.price}</span>
                      <span className={plan.highlight ? 'text-primary-200' : 'text-gray-500'}>{plan.period}</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-primary-200' : 'text-primary-600'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

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
                        Subscribe
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Transaction History */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-500" />
            Payment History
          </h2>
          
          {transactions === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any) => (
                <div
                  key={tx._id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.status === 'success' ? 'bg-emerald-100' : 'bg-amber-100'
                    }`}>
                      {tx.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.description}</p>
                      <p className="text-sm text-gray-500">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatAmount(tx.amountNaira)}</p>
                    {tx.cardLast4 && (
                      <p className="text-xs text-gray-500">
                        {tx.cardBrand} •••• {tx.cardLast4}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowCancelModal(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel Subscription?</h3>
              <p className="text-gray-600 text-sm">
                You'll keep access until <strong>{subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'end of billing period'}</strong>. 
                After that, you'll be on the free plan (5 alerts, 1 proposal/month).
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
