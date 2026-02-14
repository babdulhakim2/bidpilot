'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCurrentUser } from '@/hooks/useUser';
import { FileText, Loader2, Clock, ChevronRight, Trash2, X } from 'lucide-react';
import { normalizeText } from '@/lib/textUtils';
import { Id } from '@/convex/_generated/dataModel';

export default function ProposalsPage() {
  const { userId, isLoaded } = useCurrentUser();
  const proposals = useQuery(api.proposals.listMine) ?? [];
  const deleteProposal = useMutation(api.proposals.removeMine);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: Id<"proposals">; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await deleteProposal({ id: deleteConfirm.id });
      setDeleteConfirm(null);
    } catch (e) {
      console.error('Failed to delete:', e);
      alert('Failed to delete proposal');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    generated: 'bg-blue-100 text-blue-700',
    submitted: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">My Proposals</h1>
        <p className="text-gray-600 mt-1">{proposals.length} proposals created</p>
      </div>

      {proposals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">No proposals yet</h3>
          <p className="text-gray-500 mb-4">Generate your first proposal from a tender</p>
          <Link 
            href="/dashboard/contracts"
            className="inline-block px-6 py-2 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700"
          >
            Browse Contracts
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal: any) => (
            <div 
              key={proposal._id} 
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-md transition"
            >
              <Link href={`/dashboard/proposals/${proposal._id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{normalizeText(proposal.tenderTitle)}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(proposal.createdAt).toLocaleDateString()}</span>
                      {proposal.updatedAt !== proposal.createdAt && (
                        <span className="text-gray-400">
                          • Updated {new Date(proposal.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[proposal.status]}`}>
                      {proposal.status}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                
                {proposal.sections && proposal.sections.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {proposal.sections.slice(0, 5).map((section: string) => (
                      <span key={section} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                        {normalizeText(section)}
                      </span>
                    ))}
                    {proposal.sections.length > 5 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-400 text-xs rounded-lg">
                        +{proposal.sections.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </Link>
              
              {/* Delete Button */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteConfirm({ id: proposal._id, title: proposal.tenderTitle });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-gray-900">Delete Proposal?</h3>
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this proposal?
            </p>
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 mb-6 truncate">
              {normalizeText(deleteConfirm.title)}
            </p>
            
            <p className="text-sm text-red-600 mb-6">
              ⚠️ This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
