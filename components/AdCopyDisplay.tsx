import React, { useMemo } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';

interface ParsedSection {
    title: string;
    content: { [subheading: string]: string[] };
}

interface AdCopyDisplayProps {
    htmlContent: string;
    isLoading: boolean;
}

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button onClick={handleCopy} className="p-1 rounded-md hover:bg-dark-input text-dark-text-secondary hover:text-dark-text-primary transition-colors">
            {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
        </button>
    );
};

const AdCopyDisplay: React.FC<AdCopyDisplayProps> = ({ htmlContent, isLoading }) => {
    const parsedData = useMemo(() => {
        if (typeof window === 'undefined' || !htmlContent) return [];

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const sections: ParsedSection[] = [];

        doc.querySelectorAll('details').forEach(detailsElement => {
            const summaryElement = detailsElement.querySelector('summary');
            const title = summaryElement ? summaryElement.innerText : 'Details';
            const content: { [subheading: string]: string[] } = {};
            let currentSubheading: string | null = null;

            detailsElement.childNodes.forEach(node => {
                if (node.nodeName === 'H3') {
                    currentSubheading = (node as HTMLElement).innerText;
                    if (currentSubheading) {
                        content[currentSubheading] = [];
                    }
                } else if (currentSubheading && (node.nodeName === 'P' || node.nodeName === 'UL')) {
                    if (node.nodeName === 'P') {
                        const text = (node as HTMLElement).innerText.trim();
                        if (text) content[currentSubheading]?.push(text);
                    } else if (node.nodeName === 'UL') {
                        (node as HTMLElement).querySelectorAll('li').forEach(li => {
                            const text = li.innerText.trim();
                            if(text) content[currentSubheading]?.push(text);
                        });
                    }
                }
            });

            sections.push({ title, content });
        });

        return sections;
    }, [htmlContent]);
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="ml-3 text-md font-semibold text-dark-text-secondary">Generating ad copy...</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {parsedData.map((section, index) => (
                <details key={index} className="bg-dark-input rounded-lg border border-dark-border" open={index === 0}>
                    <summary className="cursor-pointer flex justify-between items-center p-3 font-semibold text-dark-text-primary">
                        {section.title}
                        <ChevronDownIcon className="w-5 h-5 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="p-3 border-t border-dark-border space-y-4">
                        {Object.entries(section.content).map(([subheading, items]) => (
                            <div key={subheading}>
                                <h4 className="font-semibold text-dark-text-secondary mb-2 border-b border-dark-border pb-1">{subheading}</h4>
                                <div className="space-y-2">
                                    {items.map((item, itemIndex) => (
                                        <div key={itemIndex} className="flex items-start justify-between gap-2 p-2 bg-dark-surface rounded-md text-sm">
                                            <p className="flex-1">{item}</p>
                                            <CopyButton textToCopy={item} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </details>
            ))}
        </div>
    );
};

export default AdCopyDisplay;