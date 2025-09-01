import React from 'react';
import { LogoIcon } from './icons/LogoIcon';

interface WelcomeScreenProps {
  onPromptSelect: (prompt: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPromptSelect }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 animate-fade-in">
        <LogoIcon className="h-12 w-12" />
        <h1 className="text-4xl md:text-5xl font-bold text-dark-text-primary mt-6">
            Good to See You!
        </h1>
        <h2 className="text-4xl md:text-5xl font-bold text-dark-text-secondary mt-2">
            How can I be of assistance?
        </h2>
        <p className="mt-4 text-lg text-dark-text-secondary">
            I'm available 24/7 for you, ask me anything.
        </p>
    </div>
  );
};

export default WelcomeScreen;
