import React, { useState, useCallback, useRef } from 'react';
import { GeneratedImage } from '../types';
import { enhancePrompt } from '../services/geminiService';
import { PlusIcon } from './icons/PlusIcon';
import { SendIcon } from './icons/SendIcon';
import { UserIcon } from './icons/UserIcon';
import { VideoIcon } from './icons/VideoIcon';
import { BookIcon } from './icons/BookIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { XIcon } from './icons/XIcon';

interface ChatInputProps {
  onSend: (prompt: string) => void;
  onFileSelect: (file: File | null) => void;
  selectedImage: GeneratedImage | null;
  onClearSelectedImage: () => void;
}

const SuggestionChip: React.FC<{ icon: React.ReactNode; text: string; onClick: () => void }> = ({ icon, text, onClick }) => (
    <button onClick={onClick} className="flex items-center gap-2 px-3 py-1.5 bg-dark-input border border-dark-border rounded-lg text-sm text-dark-text-secondary hover:bg-dark-surface hover:text-dark-text-primary transition-colors">
        {icon}
        <span>{text}</span>
    </button>
);


const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  onFileSelect, 
  selectedImage,
  onClearSelectedImage,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onFileSelect(file);
      } else {
        alert('Please select an image file.');
      }
    }
  }, [onFileSelect]);
  

  const handleSendClick = () => {
    if (!prompt.trim() && !selectedImage) return;
    onSend(prompt);
    setPrompt('');
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height to shrink if needed
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };
  
  const handleEnhanceClick = async () => {
    if (!prompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
        const enhanced = await enhancePrompt(prompt);
        setPrompt(enhanced);
         setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
        }, 0);
    } finally {
        setIsEnhancing(false);
    }
  };

  const fileInputDisabled = !!selectedImage;
  const canSend = prompt.trim().length > 0 || !!selectedImage;
  const canEnhance = prompt.trim().length > 0 && !isEnhancing;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
       <div className="w-full relative flex items-end gap-2 bg-dark-input border border-dark-border rounded-xl shadow-sm p-2 transition-all focus-within:ring-2 focus-within:ring-brand-primary">
        {selectedImage ? (
           <div className="relative self-center ml-1 flex-shrink-0">
                <img src={selectedImage.src} alt="Selected for refinement" className="w-12 h-12 rounded-md object-cover" />
                <button
                onClick={onClearSelectedImage}
                className="absolute -top-1.5 -right-1.5 bg-dark-surface border border-dark-border rounded-full p-0.5 text-dark-text-secondary hover:text-dark-text-primary transition-colors"
                aria-label="Clear selected image"
                >
                <XIcon className="w-4 h-4" />
                </button>
            </div>
        ) : (
            <label htmlFor="file-input" className={`cursor-pointer p-2 rounded-full transition-colors self-center ${fileInputDisabled ? '' : 'hover:bg-dark-surface'}`}>
                <PlusIcon className={`w-6 h-6 ${fileInputDisabled ? 'text-gray-600' : 'text-dark-text-secondary'}`} />
                <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files)}
                    onClick={(e) => (e.currentTarget.value = '')}
                    disabled={fileInputDisabled}
                />
            </label>
        )}
        <textarea
          ref={textareaRef}
          value={prompt}
          rows={1}
          onChange={handlePromptChange}
          onKeyDown={handleKeyDown}
          placeholder={selectedImage ? "Describe your edit..." : "Ask anything, or upload a product image..."}
          className="flex-1 w-full bg-transparent focus:outline-none text-dark-text-primary placeholder-dark-text-secondary resize-none overflow-y-hidden max-h-40 py-1.5"
          aria-label="Chat input"
        />
        <button
          onClick={handleEnhanceClick}
          disabled={!canEnhance}
          className="p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-dark-surface"
          aria-label="Enhance prompt with AI"
        >
          <MagicWandIcon className={`w-6 h-6 ${isEnhancing ? 'animate-pulse' : ''} ${canEnhance ? 'text-brand-primary' : 'text-dark-text-secondary'}`} />
        </button>
        <button
          onClick={handleSendClick}
          disabled={!canSend}
          className="p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed enabled:bg-brand-primary enabled:hover:bg-brand-secondary"
          aria-label="Send message"
        >
          <SendIcon className={`w-6 h-6 ${canSend ? 'text-white' : 'text-dark-text-secondary'}`} />
        </button>
      </div>
      
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <SuggestionChip icon={<UserIcon className="w-4 h-4" />} text="Any advice for me?" onClick={() => onSend("Any advice for me?")} />
        <SuggestionChip icon={<VideoIcon className="w-4 h-4" />} text="Some youtube video idea" onClick={() => onSend("Give me some youtube video ideas")} />
        <SuggestionChip icon={<BookIcon className="w-4 h-4" />} text="Life lessons from Kratos" onClick={() => onSend("What are some life lessons from Kratos?")} />
      </div>
    </div>
  );
};

export default ChatInput;