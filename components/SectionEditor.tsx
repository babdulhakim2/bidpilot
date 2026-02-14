'use client';

import { useState } from 'react';
import { 
  Image, Loader2, Plus, Trash2,
  Sparkles, Edit3, Check, X, Bold, Italic, List, Eye, EyeOff, Pencil
} from 'lucide-react';

export interface ProposalSection {
  id: string;
  title: string;
  content: string;
  imagePrompt?: string;
  imageUrl?: string;
}

interface SectionEditorProps {
  sections: ProposalSection[];
  onChange: (sections: ProposalSection[]) => void;
  onGenerateImage?: (sectionId: string, sectionTitle: string, prompt: string, order: number) => Promise<string | null>;
  onRemoveImage?: (sectionId: string) => Promise<void>;
  isGeneratingImage?: string | null;
}

// Simple markdown to HTML for preview
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>')
    .replace(/^(.*)$/, '<p class="mb-3">$1</p>');
}

export default function SectionEditor({ 
  sections, 
  onChange, 
  onGenerateImage,
  onRemoveImage,
  isGeneratingImage 
}: SectionEditorProps) {
  const [activeTab, setActiveTab] = useState(sections[0]?.id || '');
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [tempPrompt, setTempPrompt] = useState('');

  const activeSection = sections.find(s => s.id === activeTab);
  const activeIndex = sections.findIndex(s => s.id === activeTab);

  const updateSection = (id: string, updates: Partial<ProposalSection>) => {
    onChange(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sections.length <= 1) {
      alert('You need at least one section');
      return;
    }
    setDeleteConfirm(id);
  };

  const deleteSection = (id: string) => {
    const newSections = sections.filter(s => s.id !== id);
    onChange(newSections);
    if (activeTab === id) {
      setActiveTab(newSections[0]?.id || '');
    }
    setDeleteConfirm(null);
  };

  const addSection = () => {
    const newId = `section-${Date.now()}`;
    onChange([...sections, {
      id: newId,
      title: 'New Section',
      content: '',
    }]);
    setActiveTab(newId);
  };

  const startEditTitle = (section: ProposalSection, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitle(section.id);
    setTempTitle(section.title);
  };

  const saveTitle = (id: string) => {
    if (tempTitle.trim()) {
      updateSection(id, { title: tempTitle.trim() });
    }
    setEditingTitle(null);
  };

  const startEditPrompt = () => {
    setEditingPrompt(true);
    setTempPrompt(activeSection?.imagePrompt || '');
  };

  const savePrompt = () => {
    if (activeSection) {
      updateSection(activeSection.id, { imagePrompt: tempPrompt.trim() });
    }
    setEditingPrompt(false);
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
    if (!textarea || !activeSection) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activeSection.content;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    updateSection(activeSection.id, { content: newText });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleGenerateImage = async () => {
    if (!activeSection || !onGenerateImage) return;
    const prompt = activeSection.imagePrompt || `Professional image for ${activeSection.title}`;
    const imageUrl = await onGenerateImage(activeSection.id, activeSection.title, prompt, activeIndex);
    if (imageUrl) {
      updateSection(activeSection.id, { imageUrl });
    }
  };

  const sectionToDelete = sections.find(s => s.id === deleteConfirm);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Tabs Header */}
      <div className="border-b border-gray-200 bg-gray-50 flex items-center">
        {/* Scrollable Tabs */}
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex flex-nowrap pr-4">
            {sections.map((section) => (
              <div key={section.id} className="flex-shrink-0">
                {editingTitle === section.id ? (
                  <div className="flex items-center gap-1 px-2 py-2 border-b-2 border-primary-500 bg-white">
                    <input
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      className="w-24 sm:w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:border-primary-500 focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveTitle(section.id);
                        if (e.key === 'Escape') setEditingTitle(null);
                      }}
                    />
                    <button onClick={() => saveTitle(section.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingTitle(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => setActiveTab(section.id)}
                    className={`group flex items-center gap-1 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition cursor-pointer ${
                      activeTab === section.id
                        ? 'border-primary-500 text-primary-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="truncate max-w-[60px] sm:max-w-[100px]">{section.title}</span>
                    
                    {activeTab === section.id && (
                      <button 
                        onClick={(e) => startEditTitle(section, e)}
                        className="p-0.5 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                    
                    <button 
                      onClick={(e) => confirmDelete(section.id, e)}
                      className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition ml-1"
                      title="Delete section"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Add button */}
        <div className="flex-shrink-0 px-3 border-l border-gray-200 bg-gray-50">
          <button
            onClick={addSection}
            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
            title="Add section"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Section Content */}
      {activeSection && (
        <div className="p-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 mb-3 pb-3 border-b border-gray-100">
            <button
              onClick={() => insertMarkdown('**', '**')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('*', '*')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('\n- ')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
              title="Bullet list"
            >
              <List className="w-4 h-4" />
            </button>
            
            <div className="flex-1" />
            
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                showPreview 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">{showPreview ? 'Edit' : 'Preview'}</span>
            </button>
          </div>

          {/* Editor / Preview - Stack on mobile */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Image */}
            <div className="w-full lg:w-48 flex-shrink-0 order-2 lg:order-1">
              <div className="relative group">
                {activeSection.imageUrl ? (
                  <>
                    <img 
                      src={activeSection.imageUrl} 
                      alt={activeSection.title}
                      className="w-full h-32 lg:h-40 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-95 transition"
                      onDoubleClick={() => setPreviewImage({ url: activeSection.imageUrl!, title: activeSection.title })}
                      title="Double-click to preview"
                    />
                    {/* Delete button inside image */}
                    {onRemoveImage && (
                      <button
                        onClick={() => {
                          if (confirm('Remove this image?')) {
                            onRemoveImage(activeSection.id);
                            updateSection(activeSection.id, { imageUrl: undefined });
                          }
                        }}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="w-full h-32 lg:h-40 bg-gray-100 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center">
                    <Image className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">No image</span>
                  </div>
                )}
              </div>
              
              {/* Generate Image Button - full width */}
              {onGenerateImage && (
                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage === activeSection.id}
                  className="mt-2 w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingImage === activeSection.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {activeSection.imageUrl ? 'Regenerate' : 'Generate'} Image
                </button>
              )}
              
              {/* Image Prompt - Editable */}
              <div className="mt-2">
                {editingPrompt ? (
                  <div className="space-y-2">
                    <textarea
                      value={tempPrompt}
                      onChange={(e) => setTempPrompt(e.target.value)}
                      className="w-full text-xs p-2 border border-gray-300 rounded-lg resize-none focus:border-primary-500 focus:outline-none"
                      rows={3}
                      placeholder="Describe the image you want..."
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={savePrompt}
                        className="flex-1 px-2 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPrompt(false)}
                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={startEditPrompt}
                    className="group cursor-pointer p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-start gap-1">
                      <Pencil className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-500 line-clamp-2 flex-1">
                        {activeSection.imagePrompt || 'Click to add image prompt...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Editor / Preview */}
            <div className="flex-1 order-1 lg:order-2">
              {showPreview ? (
                <div 
                  className="min-h-[300px] lg:min-h-[400px] p-4 bg-gray-50 rounded-lg border border-gray-200 prose prose-sm max-w-none overflow-auto"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(activeSection.content) }}
                />
              ) : (
                <textarea
                  id="content-editor"
                  value={activeSection.content}
                  onChange={(e) => updateSection(activeSection.id, { content: e.target.value })}
                  className="w-full min-h-[300px] lg:min-h-[400px] px-4 py-3 border border-gray-200 rounded-lg resize-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-sm leading-relaxed font-mono"
                  placeholder="Write your content here... Use **bold**, *italic*, and - for lists"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {sections.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-gray-500 mb-4">No sections yet</p>
          <button
            onClick={addSection}
            className="px-4 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition"
          >
            Add Section
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && sectionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5">
            <h3 className="font-semibold text-lg text-gray-900 mb-3">Delete Section?</h3>
            <p className="text-gray-600 mb-2 text-sm">
              Are you sure you want to delete this section?
            </p>
            <p className="text-sm font-medium text-gray-800 bg-gray-100 rounded-lg px-3 py-2 mb-4 truncate">
              {sectionToDelete.title}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSection(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition"
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={previewImage.url} 
              alt={previewImage.title}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
            <p className="text-center text-white mt-2 text-sm">{previewImage.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
