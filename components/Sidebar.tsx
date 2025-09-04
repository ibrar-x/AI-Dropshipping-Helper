

import React from 'react';
import { ToolTab } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { XIcon } from './icons/XIcon';
import { CollapseIcon } from './icons/CollapseIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { MegaphoneIcon } from './icons/MegaphoneIcon';
import { BrushIcon } from './icons/BrushIcon';
import { UpscaleIcon } from './icons/UpscaleIcon';
import { BlenderIcon } from './icons/BlenderIcon';
import { PhotoIcon } from './icons/PhotoIcon';

interface SidebarProps {
  activeTab: ToolTab;
  onSelectTab: (tab: ToolTab) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  onOpenSettings: () => void;
}

const tools: { id: ToolTab; name: string; icon: JSX.Element }[] = [
  { id: 'library', name: 'Library', icon: <PhotoIcon className="w-5 h-5" /> },
  { id: 'ads', name: 'Ad Generator', icon: <MegaphoneIcon className="w-5 h-5" /> },
  { id: 'editor', name: 'Image Editor', icon: <BrushIcon className="w-5 h-5" /> },
  { id: 'upscaler', name: 'Image Upscaler', icon: <UpscaleIcon className="w-5 h-5" /> },
  { id: 'blender', name: 'Image Blender', icon: <BlenderIcon className="w-5 h-5" /> },
];

const Sidebar: React.FC<SidebarProps> = ({
  activeTab, onSelectTab, isOpen, setIsOpen, isCollapsed,
  setIsCollapsed, onOpenSettings
}) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      ></div>
      <aside className={`bg-dark-bg text-dark-text-primary flex flex-col flex-shrink-0 absolute md:relative z-40 h-full transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}>
        <div className="flex items-center justify-between p-4 border-b border-dark-border h-[65px] flex-shrink-0">
          <div className="flex-1 flex items-center gap-3 overflow-hidden">
            {isCollapsed ? (
              <button onClick={() => setIsCollapsed(false)} className="mx-auto" title="Expand sidebar">
                <LogoIcon className="w-8 h-8 flex-shrink-0" />
              </button>
            ) : (
              <>
                <LogoIcon className="w-8 h-8 flex-shrink-0" />
                <h1 className="text-lg font-bold whitespace-nowrap transition-opacity duration-200">AI Studio</h1>
              </>
            )}
          </div>

          {!isCollapsed && (
            <button onClick={() => setIsCollapsed(true)} className="hidden md:block p-1 text-dark-text-secondary hover:text-dark-text-primary" aria-label="Collapse sidebar">
              <CollapseIcon className="w-6 h-6 transition-transform duration-300" />
            </button>
          )}

          <button onClick={() => setIsOpen(false)} className={`md:hidden p-1 ${isCollapsed ? 'hidden' : ''}`}>
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Tools Section */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
            {tools.map(tool => {
                const isActive = activeTab === tool.id;
                return (
                    <div
                    key={tool.id}
                    className="group relative rounded-md"
                    title={isCollapsed ? tool.name : undefined}
                    >
                    <button
                        onClick={() => onSelectTab(tool.id)}
                        className={`flex items-center w-full text-left gap-3 p-3 text-sm rounded-md transition-colors ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-dark-input font-semibold' : 'hover:bg-dark-input'}`}
                    >
                        {React.cloneElement(tool.icon, { className: 'w-5 h-5 flex-shrink-0' })}
                        {!isCollapsed && <span className="truncate flex-1">{tool.name}</span>}
                    </button>
                    </div>
                );
            })}
        </nav>


        <div className="p-2 border-t border-dark-border flex-shrink-0">
          <button onClick={onOpenSettings} title="Settings" className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-dark-text-secondary rounded-md hover:bg-dark-input hover:text-dark-text-primary transition-colors ${isCollapsed ? 'md:justify-center md:px-2' : ''}`}>
            <SettingsIcon className="w-5 h-5 flex-shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'md:opacity-0 md:hidden' : 'opacity-100'}`}>Settings</span>
          </button>

          <div className={`pt-2 mt-2 transition-opacity duration-200 ${isCollapsed ? 'md:hidden' : ''}`}>
            <p className="text-xs text-dark-text-secondary text-center">© AI Product Studio</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
