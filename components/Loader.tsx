import React, { useState } from 'react';

interface LoaderProps {
  message: string;
  count?: number;
  onCancel?: () => void;
}

const Loader: React.FC<LoaderProps> = ({ message, count = 1, onCancel }) => {
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelClick = () => {
    if (onCancel) {
      setIsCancelling(true);
      onCancel();
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
            <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="ml-3 text-md font-semibold text-dark-text-primary">{message}</p>
        </div>
        {onCancel && (
            <button
                onClick={handleCancelClick}
                disabled={isCancelling}
                className="text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border px-3 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
                {isCancelling ? 'Cancelling...' : 'Cancel'}
            </button>
        )}
      </div>
      <div className={`grid gap-2 ${count > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {Array(count).fill(0).map((_, index) => (
            <div key={index} className="aspect-square bg-dark-input rounded-xl overflow-hidden relative w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-600/50 to-transparent -translate-x-full animate-shimmer"></div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Loader;