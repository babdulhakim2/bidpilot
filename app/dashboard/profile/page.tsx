'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCurrentUser } from '@/hooks/useUser';
import { 
  Settings, CreditCard, ChevronRight, Pencil, Save, Loader2
} from 'lucide-react';

const CATEGORIES = ['construction', 'ict', 'consultancy', 'supplies', 'solar', 'professional', 'maintenance', 'logistics', 'education', 'healthcare', 'security', 'electrical'];

export default function ProfilePage() {
  const { user, isLoaded } = useCurrentUser();
  const updateProfile = useMutation(api.users.updateMe);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const profile = {
    companyName: user?.companyName ?? 'Your Company',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    categories: user?.categories ?? [],
    completeness: user?.completeness ?? 25,
  };

  const handleStartEdit = () => {
    setEditCompanyName(profile.companyName);
    setEditPhone(profile.phone);
    setEditCategories(profile.categories);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        companyName: editCompanyName,
        phone: editPhone || undefined,
        categories: editCategories,
      });
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to update profile:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Profile</h1>
        {!isEditing ? (
          <button
            onClick={handleStartEdit}
            className="px-4 py-2 text-primary-600 font-medium rounded-xl hover:bg-primary-50 flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-600 font-medium rounded-xl hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        )}
      </div>

      {/* Company Info Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600">
              {(isEditing ? editCompanyName : profile.companyName).charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editCompanyName}
                onChange={(e) => setEditCompanyName(e.target.value)}
                className="font-display font-bold text-xl text-gray-900 w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="Company Name"
              />
            ) : (
              <>
                <h2 className="font-display font-bold text-xl text-gray-900">{profile.companyName}</h2>
                <p className="text-gray-500">{profile.email}</p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Phone</label>
            {isEditing ? (
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="+234 800 000 0000"
              />
            ) : (
              <p className="font-medium text-gray-900">{profile.phone || 'Not set'}</p>
            )}
          </div>
          
          <div>
            <label className="text-sm text-gray-500">Business Categories</label>
            {isEditing ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setEditCategories(prev => 
                        prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                      );
                    }}
                    className={`px-3 py-1.5 text-sm rounded-full transition capitalize ${
                      editCategories.includes(cat)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            ) : profile.categories.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-1">
                {profile.categories.map((cat) => (
                  <span key={cat} className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full capitalize">
                    {cat}
                  </span>
                ))}
              </div>
            ) : (
              <p className="font-medium text-gray-400 mt-1">No categories selected</p>
            )}
          </div>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          Account Info
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{profile.email || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-gray-500">Profile Completeness</p>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${profile.completeness}%` }}></div>
                </div>
                <span className="font-medium text-primary-600">{profile.completeness}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Link */}
      <div className="space-y-3">
        <Link 
          href="/billing"
          className="w-full p-4 bg-white rounded-xl border border-gray-200 text-left flex items-center gap-4 hover:bg-gray-50"
        >
          <CreditCard className="w-5 h-5 text-gray-500" />
          <div className="flex-1">
            <span className="font-medium text-gray-900">Billing & Subscription</span>
            <p className="text-sm text-gray-500">Manage your plan</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>
      </div>
    </>
  );
}
