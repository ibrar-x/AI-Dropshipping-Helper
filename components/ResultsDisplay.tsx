import React, { useState, useCallback } from 'react';
import { GeneratedImage, ChatMessage, GenerationPayload, GenerationOptionsProps } from '../types';
import { downloadImage } from '../utils/imageUtils';
import { DownloadIcon } from './icons/DownloadIcon';
import Loader from './Loader';
import GenerationOptions from './GenerationOptions';
import { UpscaleIcon } from './icons/UpscaleIcon';

interface ChatFeedProps {
  messages: ChatMessage[];
  onRefine: (image: GeneratedImage, prompt: string) => void;
  onStartEdit: (image: GeneratedImage) => void;
  onStartUpscale: (image: GeneratedImage) => void;
  onSelectForChat: (image: GeneratedImage) => void;
  onGenerate: (payload: GenerationPayload) => void;
  onCancelGeneration: () => void;
}

interface ImageCardProps {
  image: GeneratedImage;
  onRefine: (image: GeneratedImage, prompt: string) => void;
  onStartEdit: (image: GeneratedImage) => void;
  onStartUpscale: (image: GeneratedImage) => void;
  onSelectForChat: (image: GeneratedImage) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onRefine, onStartEdit, onStartUpscale, onSelectForChat }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      downloadImage(image.src, `lifestyle-image.jpg`);
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('Could not download image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [image.src]);

  const refinementPrompts = [
    { label: 'Brighter', prompt: 'Make the lighting brighter and more vibrant.' },
    { label: 'More Dramatic', prompt: 'Make the lighting more dramatic with deeper shadows.' },
    { label: 'Change Angle', prompt: 'Show the product from a slightly different camera angle.' },
    { label: 'Regenerate', prompt: 'Regenerate this image with a different creative style.' },
  ];

  return (
    <div className="overflow-hidden rounded-xl shadow-lg border border-dark-border mt-2 bg-dark-surface transition-all duration-300 hover:shadow-2xl hover:border-brand-primary">
      <div className="relative group">
        <img src={image.src} alt="Generated lifestyle" className="w-full h-auto object-cover" />
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
            <div className="w-full space-y-2">
                 <button 
                    onClick={() => onStartEdit(image)} 
                    className="w-full text-center bg-white/10 border border-white/20 text-white hover:bg-white/20 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors"
                >
                    Edit
                </button>
                 <button 
                    onClick={() => onStartUpscale(image)} 
                    className="w-full text-center bg-white/10 border border-white/20 text-white hover:bg-white/20 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                    <UpscaleIcon className="w-4 h-4" />
                    Upscale
                </button>
                <button 
                    onClick={() => onRefine(image, 'Create a professional advertisement for this product, with compelling copy and graphics.')} 
                    className="w-full text-center bg-white/10 border border-white/20 text-white hover:bg-white/20 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors"
                >
                    Ad Version
                </button>
                <button
                    onClick={() => onSelectForChat(image)}
                    className="w-full text-center bg-brand-primary/80 text-white hover:bg-brand-primary px-3 py-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    title="Select this image to provide text instructions in the chat bar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.832 8.832 0 01-4.325-.972l-1.402.935A.5.5 0 013.5 16.5v-1.282A6.974 6.974 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM4.535 14.12A7.001 7.001 0 0010 15a5 5 0 000-10 7 7 0 00-5.465 2.88.5.5 0 01-.818.52A8 8 0 0110 3a6 6 0 010 12 7.94 7.94 0 01-2.02-.27.5.5 0 01-.445.89z" clipRule="evenodd" /></svg>
                    Refine with Chat
                </button>
            </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <p className="text-sm font-semibold text-dark-text-secondary mb-2">Quick Refine</p>
          <div className="grid grid-cols-2 gap-2">
            {refinementPrompts.map(({label, prompt}) => (
              <button
                key={label}
                onClick={() => onRefine(image, prompt)}
                className="w-full text-center bg-dark-input border border-dark-border text-dark-text-primary hover:bg-dark-border px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-dark-text-secondary mb-2">Download</p>
          <div className="flex flex-col gap-2">
            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center justify-center gap-2 bg-dark-input border border-dark-border text-dark-text-primary hover:bg-dark-border px-3 py-1.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Download Image</span>
            </button>
          </div>
          {isDownloading && <p className="text-dark-text-secondary text-xs mt-2 text-center animate-pulse">Processing...</p>}
        </div>
      </div>
    </div>
  );
};


const MessageBubble: React.FC<{ message: ChatMessage; onRefine: (image: GeneratedImage, prompt: string) => void; onStartEdit: (image: GeneratedImage) => void; onStartUpscale: (image: GeneratedImage) => void; onSelectForChat: (image: GeneratedImage) => void; onGenerate: (payload: GenerationPayload) => void; onCancelGeneration: () => void; }> = ({ message, onRefine, onStartEdit, onStartUpscale, onSelectForChat, onGenerate, onCancelGeneration }) => {
    const isUser = message.role === 'user';
    
    if (message.isLoading) {
        return (
            <div className="flex justify-start mb-4 animate-fade-in max-w-lg w-full">
                <div className="bg-dark-surface border border-dark-border rounded-2xl p-4 shadow-sm w-full">
                   <Loader message={message.text || "Generating your scene..."} count={message.imageCount} onCancel={onCancelGeneration} />
                </div>
            </div>
        );
    }

    return (
        <div className={`flex mb-4 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`bg-dark-surface border border-dark-border text-dark-text-primary rounded-2xl p-4 max-w-lg shadow-sm`}>
                {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
                
                {message.options && (
                  <GenerationOptions
                      productCategory={message.options.productCategory}
                      productDescription={message.options.productDescription}
                      onGenerate={onGenerate}
                  />
                )}

                {message.images && (
                     <div className={`mt-2 flex gap-2 ${isUser ? 'flex-row items-end' : 'flex-col'}`}>
                        {message.images.map(img => (
                             <div key={img.id} >
                                 {isUser ? (
                                     <img src={img.src} alt="User upload preview" className="rounded-lg max-h-48" />
                                 ) : (
                                     <ImageCard image={img} onRefine={onRefine} onStartEdit={onStartEdit} onStartUpscale={onStartUpscale} onSelectForChat={onSelectForChat} />
                                 )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ChatFeed: React.FC<ChatFeedProps> = ({ messages, onRefine, onStartEdit, onStartUpscale, onSelectForChat, onGenerate, onCancelGeneration }) => {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto w-full mt-auto">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onRefine={onRefine} onStartEdit={onStartEdit} onStartUpscale={onStartUpscale} onSelectForChat={onSelectForChat} onGenerate={onGenerate} onCancelGeneration={onCancelGeneration} />
      ))}
    </div>
  );
};

export default ChatFeed;