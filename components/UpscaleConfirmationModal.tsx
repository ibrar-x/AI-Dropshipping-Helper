import React from 'react';

interface UpscaleConfirmationModalProps {
  onConfirm: (action: 'replace' | 'copy') => void;
  onCancel: () => void;
}

const UpscaleConfirmationModal: React.FC<UpscaleConfirmationModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={onCancel}>
      <div className="bg-dark-surface rounded-xl shadow-2xl w-full max-w-md p-6 text-center" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-2">Save Upscaled Image</h2>
        <p className="text-dark-text-secondary mb-6">How would you like to save the new high-resolution image?</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => onConfirm('replace')}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md"
          >
            Replace Original
          </button>
          <button
            onClick={() => onConfirm('copy')}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-brand-primary text-white rounded-md hover:bg-brand-secondary"
          >
            Save as a Copy
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpscaleConfirmationModal;
