import React from 'react';

interface ToggleSwitchProps {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  description?: string;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, enabled, onToggle, description, disabled }) => (
  <div className={`py-2 ${disabled ? 'opacity-50' : ''}`}>
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="font-semibold text-dark-text-primary text-sm">{label}</span>
        {description && <span className="text-xs text-dark-text-secondary">{description}</span>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(!enabled)}
        className={`${enabled ? 'bg-brand-primary' : 'bg-dark-border'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-dark-surface disabled:cursor-not-allowed`}
        role="switch"
        aria-checked={enabled}
      >
        <span className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
      </button>
    </div>
  </div>
);

export default ToggleSwitch;
