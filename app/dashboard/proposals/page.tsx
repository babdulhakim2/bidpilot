'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCurrentUser } from '@/hooks/useUser';
import { FileText, Download, Send, Loader2 } from 'lucide-react';

export default function ProposalsPage() {
  const { userId, isLoaded } = useCurrentUser();
  const proposals = useQuery(api.proposals.listByUser, userId ? { userId } : 'skip') ?? [];

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

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
            href="/dashboard/tenders"
            className="inline-block px-6 py-2 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700"
          >
            Browse Opportunities
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal: any) => (
            <div key={proposal._id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{proposal.tenderTitle}</h3>
                  <p className="text-sm text-gray-500">
                    Created {new Date(proposal.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  proposal.status === 'generated' ? 'bg-emerald-100 text-emerald-700' :
                  proposal.status === 'submitted' ? 'bg-primary-100 text-primary-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {proposal.sections?.map((section: string) => (
                  <span key={section} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                    {section}
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                <button className="flex-1 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button className="flex-1 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Submit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
