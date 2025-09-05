
import React, { useEffect, useState } from 'react';
// FIX: Correct import path for types.
import { ToastInfo } from '../types';
import { XIcon } from './icons/XIcon';

interface ToastProps {
  toast: ToastInfo;
  onRemove: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, 5000); 

    return () => {
      clearTimeout(timer);
    };
  }, [toast.id, onRemove]);

  const handleClose = () => {
     setIsExiting(true);
     setTimeout(() => onRemove(toast.id), 300);
  };
  
  const typeClasses = {
      info: 'border-blue-500',
      success: 'border-green-500',
      error: 'border-red-500'
  }

  return (
    <div
      className={`w-full max-w-sm bg-dark-surface shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 ${typeClasses[toast.type]} transition-all duration-300 ease-in-out ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
    >
      <div className="p-4">
        <div className="flex items-start">
          {toast.imageSrc && (
              <div className="flex-shrink-0 mr-3">
                  <img className="h-16 w-16 rounded-md object-cover" src={toast.imageSrc} alt="Toast context" />
              </div>
          )}
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold text-dark-text-primary">{toast.title}</p>
            <p className="mt-1 text-sm text-dark-text-secondary whitespace-pre-wrap">{toast.message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className="bg-dark-surface rounded-md inline-flex text-dark-text-secondary hover:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
            >
              <span className="sr-only">Close</span>
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;
