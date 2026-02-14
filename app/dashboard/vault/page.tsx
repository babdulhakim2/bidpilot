'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCurrentUser } from '@/hooks/useUser';
import { useStore } from '@/lib/store';
import { Id } from '@/convex/_generated/dataModel';
import { 
  Upload, FolderOpen, FileText, Package, File, Check, Loader2, Trash2
} from 'lucide-react';
import UploadModal from '@/components/UploadModal';

export default function VaultPage() {
  const { user, userId, isLoaded } = useCurrentUser();
  const { showUploadModal, setShowUploadModal } = useStore();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: Id<"documents">; name: string } | null>(null);

  const documents = useQuery(api.documents.listByUser, userId ? { userId } : 'skip') ?? [];
  const deleteDocument = useMutation(api.documents.remove);

  const profile = {
    completeness: user?.completeness ?? 25,
  };

  const getDocIcon = (type: string) => {
    switch(type) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-500" />;
      case 'zip': return <Package className="w-6 h-6 text-amber-500" />;
      default: return <File className="w-6 h-6 text-gray-400" />;
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Document Vault</h1>
          <p className="text-gray-600 mt-1">{documents.length} documents uploaded</p>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition shadow-lg shadow-primary-500/20 flex items-center gap-1.5"
        >
          <Upload className="w-4 h-4" /> Upload
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-900">Profile Completeness</span>
          <span className="font-bold text-primary-600">{profile.completeness}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500" style={{ width: `${profile.completeness}%` }}></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">Upload more documents to improve your match score</p>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-500 mb-4">Upload your company documents to get started</p>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700"
          >
            Upload Documents
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc: any) => (
            <div key={doc._id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                {getDocIcon(doc.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{doc.name}</div>
                <div className="text-sm text-gray-500">{doc.category} • {doc.size}</div>
              </div>
              {doc.status === 'verified' ? (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Verified
                </span>
              ) : doc.status === 'processing' || doc.status === 'extracting' ? (
                <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-medium rounded-full flex items-center gap-1 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Processing
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full">Rejected</span>
              )}
              <button 
                onClick={() => setDeleteConfirm({ id: doc._id, name: doc.name })}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Document?</h3>
              <p className="text-gray-600 text-sm">
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteDocument({ id: deleteConfirm.id });
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
