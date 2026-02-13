'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="font-display font-bold text-xl text-gray-900">BidPilot</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition px-3 py-2">
                Log in
              </Link>
              <Link href="/dashboard" className="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition px-4 py-2 rounded-lg shadow-lg shadow-primary-500/20">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
            <span className="text-sm font-medium text-primary-700">Now tracking 1,200+ active tenders</span>
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight text-balance mb-6">
            Never miss a <span className="text-primary-600">government contract</span> again
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            AI-powered tender matching & proposal generation for Nigerian contractors. 
            Get real-time alerts, see your qualification score, and generate winning proposals in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sm:w-80 px-5 py-3.5 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-gray-900 placeholder:text-gray-400"
            />
            <button className="w-full sm:w-auto px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 transition transform hover:scale-[1.02] active:scale-[0.98]">
              Start Free Trial →
            </button>
          </div>
          
          <p className="text-sm text-gray-500">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 bg-primary-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '₦50B+', label: 'Contract Value Tracked' },
              { value: '1,200+', label: 'Active Tenders' },
              { value: '500+', label: 'Contractors' },
              { value: '92%', label: 'Match Accuracy' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-display text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-primary-200 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How BidPilot Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Three simple steps to start winning government contracts
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: '📁',
                title: 'Upload Your Documents',
                desc: 'Add your CAC, tax clearance, past contracts, and certifications to your secure Document Vault. Our AI extracts your capabilities automatically.',
              },
              {
                step: '02',
                icon: '🎯',
                title: 'Get Matched Instantly',
                desc: 'We monitor 50+ sources daily. When a tender matches your profile, you get an instant alert with your qualification score.',
              },
              {
                step: '03',
                icon: '📄',
                title: 'Generate & Submit',
                desc: 'Our AI generates professional proposals tailored to each tender. Download as Word/PDF and submit. Done in minutes, not days.',
              },
            ].map((item) => (
              <div key={item.step} className="relative bg-white rounded-2xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100 hover:shadow-2xl hover:shadow-gray-200/50 transition group">
                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-xl bg-primary-600 text-white font-bold flex items-center justify-center text-sm shadow-lg">
                  {item.step}
                </div>
                <div className="text-4xl mb-4 group-hover:scale-110 transition">{item.icon}</div>
                <h3 className="font-display text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to win contracts
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🔔', title: 'Real-time Alerts', desc: 'Get notified instantly when new tenders match your profile' },
              { icon: '📊', title: 'Qualification Score', desc: 'See your match % and what docs you need to qualify' },
              { icon: '🤖', title: 'AI Proposals', desc: 'Generate professional proposals in minutes, not days' },
              { icon: '📁', title: 'Document Vault', desc: 'Secure cloud storage for all your company documents' },
              { icon: '📅', title: 'Deadline Tracking', desc: 'Never miss a submission deadline with reminders' },
              { icon: '📈', title: 'Win Analytics', desc: 'Track your bid success rate and improve over time' },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-200 hover:shadow-lg transition">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-600">Start free, upgrade when you're ready</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter',
                price: '₦15,000',
                period: '/month',
                desc: 'For individual contractors',
                features: ['50 tender alerts/month', '3 AI proposals/month', 'Document Vault (1GB)', 'Email support'],
                cta: 'Start Free Trial',
                highlight: false,
              },
              {
                name: 'Pro',
                price: '₦50,000',
                period: '/month',
                desc: 'For growing businesses',
                features: ['Unlimited tender alerts', '15 AI proposals/month', 'Qualification matching', 'Document Vault (10GB)', 'Priority support'],
                cta: 'Start Free Trial',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: '₦150,000',
                period: '/month',
                desc: 'For large contractors',
                features: ['Everything in Pro', 'Unlimited proposals', 'API access', 'Dedicated account manager', 'Custom integrations'],
                cta: 'Contact Sales',
                highlight: false,
              },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-8 ${plan.highlight ? 'bg-primary-600 text-white ring-4 ring-primary-600 ring-offset-4 scale-105' : 'bg-white border border-gray-200'}`}>
                <div className={`text-sm font-semibold mb-2 ${plan.highlight ? 'text-primary-200' : 'text-primary-600'}`}>{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="font-display text-4xl font-bold">{plan.price}</span>
                  <span className={plan.highlight ? 'text-primary-200' : 'text-gray-500'}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-primary-100' : 'text-gray-600'}`}>{plan.desc}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${plan.highlight ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-600'}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-xl font-semibold transition ${plan.highlight ? 'bg-white text-primary-600 hover:bg-gray-100' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to win more contracts?
          </h2>
          <p className="text-lg text-primary-100 mb-8">
            Join 500+ contractors already using BidPilot to find and win government contracts.
          </p>
          <Link href="/dashboard" className="inline-flex px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl shadow-xl hover:shadow-2xl transition transform hover:scale-[1.02]">
            Start Your Free Trial →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <span className="text-white font-bold">B</span>
              </div>
              <span className="font-display font-bold text-white">BidPilot.ng</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition">Privacy</a>
              <a href="#" className="hover:text-white transition">Terms</a>
              <a href="#" className="hover:text-white transition">Contact</a>
            </div>
            <div className="text-sm">© 2026 BidPilot. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
