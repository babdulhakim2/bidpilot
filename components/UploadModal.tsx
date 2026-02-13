'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { FolderOpen, FileText, X, Upload } from 'lucide-react';

export default function UploadModal() {
  const { showUploadModal, setShowUploadModal, uploadDocument } = useStore();
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState('Registration');
  const [isDragging, setIsDragging] = useState(false);

  if (!showUploadModal) return null;

  const handleUpload = () => {
    if (!fileName) return;
    uploadDocument(fileName.endsWith('.pdf') ? fileName : fileName + '.pdf', category);
    setFileName('');
    setCategory('Registration');
  };

  const simulateFileSelect = () => {
    const mockFiles = [
      'PENCOM Certificate.pdf',
      'ITF Compliance.pdf',
      'Audited Financial Statement 2025.pdf',
      'NSITF Certificate.pdf',
      'Bank Reference Letter.pdf',
    ];
    const randomFile = mockFiles[Math.floor(Math.random() * mockFiles.length)];
    setFileName(randomFile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-gray-900">Upload Document</h2>
          <button 
            onClick={() => setShowUploadModal(false)}
            className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Drop Zone */}
          <div 
            onClick={simulateFileSelect}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); simulateFileSelect(); }}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-center mb-3">
              <FolderOpen className="w-10 h-10 text-gray-400" />
            </div>
            <p className="font-medium text-gray-900 mb-1">
              {fileName || 'Click or drag to upload'}
            </p>
            <p className="text-sm text-gray-500">PDF, DOC, ZIP up to 25MB</p>
          </div>

          {fileName && (
            <div className="mt-4 p-3 bg-primary-50 rounded-xl flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary-600" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{fileName}</p>
                <p className="text-xs text-gray-500">Ready to upload</p>
              </div>
              <button 
                onClick={() => setFileName('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Category Select */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="Registration">Registration (CAC, BN)</option>
              <option value="Tax">Tax (TCC, VAT)</option>
              <option value="Compliance">Compliance (PENCOM, ITF, NSITF)</option>
              <option value="Financial">Financial Statements</option>
              <option value="Experience">Past Contracts & Experience</option>
              <option value="Profile">Company Profile</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button 
              onClick={() => setShowUploadModal(false)}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpload}
              disabled={!fileName}
              className="flex-1 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
