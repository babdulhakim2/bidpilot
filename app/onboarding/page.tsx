'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, ChevronRight, ChevronLeft, Check, 
  Construction, Monitor, Users, Package, Sun, Briefcase,
  Wrench, Truck, GraduationCap, Heart, Shield, Zap,
  FolderSync, Upload, ArrowRight
} from 'lucide-react';

const CATEGORIES = [
  { id: 'construction', label: 'Construction', icon: Construction, description: 'Building, renovation, civil works' },
  { id: 'ict', label: 'ICT & Technology', icon: Monitor, description: 'Software, hardware, IT services' },
  { id: 'consultancy', label: 'Consultancy', icon: Users, description: 'Advisory, professional services' },
  { id: 'supplies', label: 'Supplies & Goods', icon: Package, description: 'Office supplies, equipment' },
  { id: 'solar', label: 'Solar & Energy', icon: Sun, description: 'Renewable energy, power systems' },
  { id: 'professional', label: 'Professional Services', icon: Briefcase, description: 'Legal, accounting, HR' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, description: 'Repairs, facility management' },
  { id: 'logistics', label: 'Logistics & Transport', icon: Truck, description: 'Shipping, fleet, warehousing' },
  { id: 'education', label: 'Education & Training', icon: GraduationCap, description: 'Training programs, e-learning' },
  { id: 'healthcare', label: 'Healthcare', icon: Heart, description: 'Medical supplies, health services' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Physical security, cybersecurity' },
  { id: 'electrical', label: 'Electrical', icon: Zap, description: 'Electrical installations, systems' },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [companyName, setCompanyName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const canProceed = () => {
    if (step === 1) return companyName.trim().length > 0;
    if (step === 2) return selectedCategories.length > 0;
    return true;
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In real app, save to backend/localStorage
    localStorage.setItem('bidpilot_profile', JSON.stringify({
      companyName,
      categories: selectedCategories,
      googleConnected,
      completedAt: new Date().toISOString()
    }));
    
    router.push('/dashboard');
  };

  const handleGoogleConnect = () => {
    // In real app, this would trigger OAuth flow
    // For now, simulate connection
    setGoogleConnected(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <span className="font-display font-bold text-xl text-white">BidPilot</span>
        </div>
      </header>

      {/* Progress */}
      <div className="px-6 mb-8">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                s < step ? 'bg-white text-primary-600' :
                s === step ? 'bg-white text-primary-600 ring-4 ring-white/30' :
                'bg-white/20 text-white/60'
              }`}>
                {s < step ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-1 mx-1 rounded-full transition-all ${
                  s < step ? 'bg-white' : 'bg-white/20'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-3">
          <span className="text-white/80 text-sm">
            {step === 1 && 'Company Information'}
            {step === 2 && 'Select Categories'}
            {step === 3 && 'Connect Documents'}
          </span>
        </div>
      </div>

      {/* Card */}
      <div className="px-4 pb-8">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg mx-auto overflow-hidden">
          
          {/* Step 1: Company Info */}
          {step === 1 && (
            <div className="p-6 sm:p-8">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mb-6">
                <Building2 className="w-7 h-7 text-primary-600" />
              </div>
              <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
                What's your company name?
              </h1>
              <p className="text-gray-600 mb-6">
                We'll use this to personalize your experience
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Apex Solutions Ltd"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Categories */}
          {step === 2 && (
            <div className="p-6 sm:p-8">
              <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
                What tenders interest you?
              </h1>
              <p className="text-gray-600 mb-6">
                Select all categories relevant to your business
              </p>

              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className={`font-medium text-sm ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                            {cat.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {cat.description}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-4 h-4 text-primary-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-primary-600">{selectedCategories.length}</span> categories selected
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Document Sync */}
          {step === 3 && (
            <div className="p-6 sm:p-8">
              <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
                Connect your documents
              </h1>
              <p className="text-gray-600 mb-6">
                We'll analyze your company documents to improve tender matching
              </p>

              <div className="space-y-4">
                {/* Google Drive Option */}
                <button
                  onClick={handleGoogleConnect}
                  disabled={googleConnected}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                    googleConnected 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      googleConnected ? 'bg-emerald-500 text-white' : 'bg-gray-100'
                    }`}>
                      {googleConnected ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <FolderSync className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {googleConnected ? 'Google Drive Connected' : 'Connect Google Drive'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {googleConnected 
                          ? 'We\'ll sync your company documents automatically'
                          : 'Sync documents from your Google Drive folder'
                        }
                      </div>
                    </div>
                    {!googleConnected && (
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Manual Upload Option */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">or</span>
                  </div>
                </div>

                <button className="w-full p-5 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50/50 transition-all text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div className="font-medium text-gray-700">Upload documents manually</div>
                  <div className="text-sm text-gray-500">PDF, DOC, ZIP up to 25MB each</div>
                </button>

                {/* Skip Option */}
                <p className="text-center text-sm text-gray-500 mt-4">
                  You can always connect documents later from your Vault
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            
            <button
              onClick={() => {
                if (step < 3) setStep(step + 1);
                else handleComplete();
              }}
              disabled={!canProceed() || isSubmitting}
              className="flex-1 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up...
                </>
              ) : step < 3 ? (
                <>
                  Continue <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Complete Setup <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
