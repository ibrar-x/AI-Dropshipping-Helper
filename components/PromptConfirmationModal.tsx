
import React, { useState, useEffect, useRef } from 'react';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { XIcon } from './icons/XIcon';

interface PromptConfirmationModalProps {
  originalPrompt: string;
  enhancedPrompt: string;
  onConfirm: (finalPrompt: string) => void;
  onCancel: () => void;
  isGenerating: boolean;
}

const PromptConfirmationModal: React.FC<PromptConfirmationModalProps> = ({
  originalPrompt,
  enhancedPrompt,
  onConfirm,
  onCancel,
  isGenerating
}) => {
  const [editedPrompt, setEditedPrompt] = useState(enhancedPrompt);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedPrompt]);

  const handleConfirm = () => {
    onConfirm(editedPrompt);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in text-dark-text-primary">
      <div className="bg-dark-surface rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <MagicWandIcon className="w-6 h-6 text-brand-primary" />
            <h2 className="text-xl font-bold">Confirm Your Enhanced Prompt</h2>
          </div>
          <button onClick={onCancel} className="p-1 rounded-full hover:bg-dark-input" disabled={isGenerating}>
            <XIcon className="w-5 h-5" />
          </button>
        </header>

        <main className="p-6 overflow-y-auto space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-dark-text-secondary mb-1">Original Prompt</h3>
            <p className="text-sm bg-dark-input p-2 rounded-md border border-dark-border italic">"{originalPrompt}"</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dark-text-secondary mb-1">AI-Enhanced Prompt (Editable)</h3>
            <textarea
              ref={textareaRef}
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="w-full text-base rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary px-3 py-2 resize-none"
              rows={6}
              disabled={isGenerating}
              autoFocus
            />
          </div>
        </main>
        
        <footer className="flex justify-end items-center gap-4 p-4 border-t border-dark-border bg-dark-bg/50 rounded-b-xl">
           <button onClick={onCancel} disabled={isGenerating} className="px-4 py-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md disabled:opacity-50">
                Cancel
            </button>
            <button
                onClick={handleConfirm}
                disabled={!editedPrompt.trim() || isGenerating}
                className="px-6 py-2 text-sm font-bold bg-brand-primary text-white rounded-md hover:bg-brand-secondary disabled:bg-gray-600 disabled:cursor-wait"
            >
                {isGenerating ? 'Generating...' : 'Generate Images'}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default PromptConfirmationModal;
