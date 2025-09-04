
import React, { useState } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

const CollapsibleSection: React.FC<{ title: string; content: string }> = ({ title, content }) => {
    const [isOpen, setIsOpen] = useState(false);

    // A very basic sanitizer to prevent major issues. In a real app, use a robust library like DOMPurify.
    const sanitizedContent = content
        .replace(/<script.*?>.*?<\/script>/gi, '')
        .replace(/onerror\s*=\s*".*?"/gi, '');

    return (
        <div className="bg-dark-input rounded-lg my-2 border border-dark-border">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-left">
                <h3 className="font-semibold text-dark-text-primary">{title}</h3>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div 
                    className="prose prose-sm prose-invert p-3 border-t border-dark-border text-dark-text-secondary max-w-none 
                               [&>h3]:font-semibold [&>h3]:text-dark-text-primary [&>ul]:list-disc [&>ul]:pl-5 [&>p]:my-2"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
                />
            )}
        </div>
    );
};

export const MarkdownContent: React.FC<{ text: string }> = ({ text }) => {
    // Split the text by the <details> tag, keeping the delimiter
    const sections = text.split(/(?=<details>)/g).filter(s => s.trim() !== '');
    
    if (sections.length === 0) {
        return <p className="whitespace-pre-wrap">{text}</p>;
    }
    
    return (
        <div>
            {sections.map((sectionText, index) => {
                const summaryMatch = sectionText.match(/<summary>(.*?)<\/summary>/s);
                const summary = summaryMatch ? summaryMatch[1] : 'Details';
                const content = sectionText.replace(/<details>.*?<summary>.*?<\/summary>/s, '').replace('</details>', '').trim();
                return <CollapsibleSection key={index} title={summary} content={content} />;
            })}
        </div>
    );
};

export default MarkdownContent;
