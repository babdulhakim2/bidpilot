'use client';

import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { 
  Bell, FileSearch, Sparkles, FolderLock, 
  Calendar, TrendingUp, ArrowRight, CheckCircle2,
  Zap, Shield, Clock
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="font-display font-bold text-xl text-gray-900">BidPilot</span>
            </div>
            <div className="flex items-center gap-3">
              <SignedOut>
                <Link href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2">
                  Log in
                </Link>
                <Link href="/sign-up" className="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-xl">
                  Get Started
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard" className="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-xl">
                  Dashboard
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-50 rounded-full px-4 py-1.5 mb-8">
            <Zap className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-medium text-primary-700">AI-Powered Tender Matching</span>
          </div>
          
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            Win more government contracts
          </h1>
          
          <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
            Find tenders, check your eligibility, and generate proposals — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/sign-up" 
              className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/sign-in" 
              className="w-full sm:w-auto px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
            >
              I have an account
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">
              How it works
            </h2>
            <p className="text-gray-500">Three steps to your next contract</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FolderLock,
                title: 'Upload your docs',
                desc: 'CAC, tax clearance, past contracts. We keep them secure.',
              },
              {
                icon: FileSearch,
                title: 'Get matched',
                desc: 'We scan 50+ sources daily and alert you to relevant tenders.',
              },
              {
                icon: Sparkles,
                title: 'Generate proposals',
                desc: 'AI writes tailored proposals. Download and submit.',
              },
            ].map((item, i) => (
              <div key={item.title} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <item.icon className="w-7 h-7 text-primary-600" />
                </div>
                <div className="text-sm font-semibold text-primary-600 mb-2">0{i + 1}</div>
                <h3 className="font-display text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Bell, title: 'Instant Alerts', desc: 'New tenders sent to your phone' },
              { icon: CheckCircle2, title: 'Eligibility Check', desc: 'Know if you qualify before you apply' },
              { icon: Sparkles, title: 'AI Proposals', desc: 'Professional bids in minutes' },
              { icon: FolderLock, title: 'Document Vault', desc: 'Secure storage for all your docs' },
              { icon: Calendar, title: 'Deadline Reminders', desc: 'Never miss a submission' },
              { icon: TrendingUp, title: 'Win Tracking', desc: 'Improve your success rate' },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-lg transition group">
                <f.icon className="w-6 h-6 text-primary-600 mb-4 group-hover:scale-110 transition" />
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 text-center">
            {[
              { icon: Shield, text: 'Bank-level security' },
              { icon: Zap, text: 'Updates every hour' },
              { icon: Clock, text: 'Save 10+ hours/week' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 text-gray-600">
                <item.icon className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">
              Simple pricing
            </h2>
            <p className="text-gray-500">Choose the plan that fits your business</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="rounded-2xl border border-gray-200 p-8 bg-white">
              <div className="text-sm font-semibold text-primary-600 mb-2">Starter</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-4xl font-bold text-gray-900">₦20k</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-500 mb-6">For individual contractors</p>
              <ul className="space-y-3 mb-8">
                {['15 tender alerts/month', '3 AI proposals/month', 'Document Vault', 'Email support'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" className="block w-full py-3 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition">
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl bg-primary-600 p-8 text-white relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-500 text-white text-xs font-bold rounded-full">
                POPULAR
              </div>
              <div className="text-sm font-semibold text-primary-200 mb-2">Pro</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-4xl font-bold">₦50k</span>
                <span className="text-primary-200">/month</span>
              </div>
              <p className="text-sm text-primary-100 mb-6">For growing businesses</p>
              <ul className="space-y-3 mb-8">
                {['100 tender alerts/month', '10 AI proposals/month', 'Qualification matching', 'Priority support'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary-200 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" className="block w-full py-3 text-center bg-white hover:bg-gray-100 text-primary-600 font-semibold rounded-xl transition">
                Get Started
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-gray-200 p-8 bg-white">
              <div className="text-sm font-semibold text-primary-600 mb-2">Enterprise</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-4xl font-bold text-gray-900">Custom</span>
              </div>
              <p className="text-sm text-gray-500 mb-6">For large contractors</p>
              <ul className="space-y-3 mb-8">
                {['Unlimited alerts', 'Unlimited proposals', 'API access', 'Dedicated account manager'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" className="block w-full py-3 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
            Ready to start winning?
          </h2>
          <p className="text-gray-500 mb-8">
            Join contractors across Nigeria finding and winning government contracts.
          </p>
          <Link 
            href="/sign-up" 
            className="inline-flex px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl items-center gap-2 transition"
          >
            Create your account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-display font-semibold text-gray-900">BidPilot</span>
          </div>
          <div className="text-sm text-gray-400">© 2026 BidPilot. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
