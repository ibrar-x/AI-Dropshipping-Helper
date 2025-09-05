import React, { useState, useEffect } from 'react';
import { AdBrief } from '../types';
import { MagicWandIcon } from './icons/MagicWandIcon';
import MarkdownContent from './MarkdownContent';

interface PlatformContentGeneratorProps {
  platform: string;
  brief: AdBrief;
  generatedContent: string;
  isLoading: boolean;
  onGenerate: (prompt: string) => void;
}

const PlatformContentGenerator: React.FC<PlatformContentGeneratorProps> = ({
  platform,
  brief,
  generatedContent,
  isLoading,
  onGenerate,
}) => {
  const [userRequest, setUserRequest] = useState('');

  useEffect(() => {
    // Auto-generate a sensible default prompt when the platform or product name changes.
    const productName = brief.product.name || 'the product';
    let defaultPrompt = '';
    switch (platform.toLowerCase()) {
        case 'shopify':
            defaultPrompt = `Write a compelling SEO-optimized product description for ${productName}. Focus on its key benefits and unique selling points.`;
            break;
        case 'etsy':
            defaultPrompt = `Create a friendly and descriptive Etsy listing for ${productName}, highlighting its handmade qualities and story.`;
            break;
        case 'ebay':
            defaultPrompt = `Generate a keyword-rich title and a detailed item description for an eBay listing of ${productName}.`;
            break;
        case 'instagram post':
             defaultPrompt = `Write a catchy Instagram caption for a post featuring ${productName}. Include relevant hashtags.`;
             break;
        default:
            defaultPrompt = `Write a short, engaging marketing copy for ${productName} for the ${platform} platform.`;
    }
    setUserRequest(defaultPrompt);
  }, [platform, brief.product.name]);

  const handleGenerateClick = () => {
    if (userRequest.trim()) {
      onGenerate(userRequest);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-dark-text-secondary mb-2">
          What content do you need for {platform}?
        </label>
        <textarea
          value={userRequest}
          onChange={(e) => setUserRequest(e.target.value)}
          rows={3}
          className="w-full text-sm rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary px-3 py-2 resize-y"
          placeholder={`e.g., "Write a product description for ${brief.product.name || 'the product'}"`}
        />
      </div>
      <button
        onClick={handleGenerateClick}
        disabled={isLoading || !userRequest.trim()}
        className="w-full flex items-center justify-center gap-2 bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
      >
        <MagicWandIcon className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`} />
        {isLoading ? 'Generating...' : 'Generate Content'}
      </button>

      {(isLoading || generatedContent) && (
        <div className="pt-4 border-t border-dark-border/50">
           {isLoading && !generatedContent ? (
             <div className="flex items-center justify-center p-4">
                <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="ml-3 text-sm font-semibold text-dark-text-secondary">Generating content...</p>
            </div>
           ) : (
            <div className="prose prose-sm prose-invert p-3 bg-dark-surface rounded-md border border-dark-border/50 max-w-none text-dark-text-secondary">
                 <MarkdownContent text={generatedContent} />
            </div>
           )}
        </div>
      )}
    </div>
  );
};

export default PlatformContentGenerator;