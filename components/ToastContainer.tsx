
import React from 'react';
// FIX: Correct import path for the Zustand store.
import { useAppStore } from '../store';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const toasts = useAppStore(state => state.toasts);
  const onRemove = useAppStore(state => state.removeToast);
  
  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-50"
    >
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
