import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store';
import { BrandKit, BrandKitItem, BrandKitItemType } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PaletteIcon } from '../icons/PaletteIcon';
import { fileToBase64 } from '../../utils/imageUtils';
import { XIcon } from '../icons/XIcon';
import { PencilIcon } from '../icons/PencilIcon';

// --- Helper Components ---

const loadedFonts = new Set<string>();

const loadFont = (fontFamily: string, url?: string) => {
  if (!url || !fontFamily) return;
  const styleId = `font-style-${fontFamily.replace(/\s/g, '-')}`;
  if (document.getElementById(styleId) || loadedFonts.has(fontFamily)) {
    return;
  }
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @font-face {
      font-family: "${fontFamily}";
      src: url("${url}");
    }
  `;
  document.head.appendChild(style);
  loadedFonts.add(fontFamily);
};

const TagInput: React.FC<{ tags: string[]; onTagsChange: (tags: string[]) => void }> = ({ tags, onTagsChange }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = inputValue.trim().toLowerCase();
            if (newTag && !tags.includes(newTag)) {
                onTagsChange([...tags, newTag]);
            }
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className="bg-dark-input p-2 rounded-md border border-dark-border">
            {tags.length > 0 && (
                 <div className="flex flex-wrap gap-1 mb-2">
                    {tags.map(tag => (
                        <div key={tag} className="flex items-center gap-1 bg-dark-surface text-xs px-2 py-0.5 rounded-full">
                            {tag}
                            <button onClick={() => removeTag(tag)}><XIcon className="w-3 h-3"/></button>
                        </div>
                    ))}
                </div>
            )}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add tags (press Enter)..."
                className="w-full bg-transparent text-sm focus:outline-none text-dark-text-secondary"
            />
        </div>
    );
};

const BrandKitItemCard: React.FC<{ 
    item: BrandKitItem; 
    onUpdate: (item: BrandKitItem) => void; 
    onDelete: () => void; 
}> = ({ item, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [dirtyItem, setDirtyItem] = useState(item);

    useEffect(() => {
        setDirtyItem(item);
    }, [item]);
    
    useEffect(() => {
        if (item.type === 'font' && item.url) {
            loadFont(item.value, item.url);
        }
    }, [item.type, item.value, item.url]);

    const handleSave = () => {
        onUpdate(dirtyItem);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setDirtyItem(item);
        setIsEditing(false);
    }
    
    const renderContent = () => {
        const targetItem = isEditing ? dirtyItem : item;

        switch (targetItem.type) {
            case 'logo':
                return (
                    <div className="w-full h-full bg-dark-input flex items-center justify-center rounded-md p-2">
                        <img src={targetItem.value} alt={targetItem.name} className="max-w-full max-h-full object-contain" />
                    </div>
                );
            case 'color':
                return (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-16 h-16 rounded-md border-4 border-dark-input" style={{ backgroundColor: targetItem.value }} />
                        <div className="font-mono text-lg">{targetItem.value}</div>
                    </div>
                );
            case 'font':
                return (
                     <p className="text-xl sm:text-2xl truncate p-2" style={{ fontFamily: `'${targetItem.value}', sans-serif` }}>
                        The quick brown fox
                    </p>
                );
            default: return null;
        }
    }
    
    const renderEditFields = () => (
         <div className="space-y-3 p-3">
             <input type="text" value={dirtyItem.name} onChange={e => setDirtyItem(p => ({...p, name: e.target.value}))} placeholder="Item Name" className="w-full text-sm font-semibold bg-dark-input p-2 rounded-md" />
            {item.type === 'color' && (
                <div className="flex items-center gap-2">
                    <div className="relative w-10 h-10">
                        <input type="color" value={dirtyItem.value} onChange={e => setDirtyItem(p => ({...p, value: e.target.value}))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className="w-10 h-10 rounded-md border border-dark-border" style={{ backgroundColor: dirtyItem.value }}></div>
                    </div>
                    <input type="text" value={dirtyItem.value} onChange={e => setDirtyItem(p => ({...p, value: e.target.value}))} placeholder="Hex Code" className="flex-1 text-sm bg-dark-input p-2 rounded-md" />
                </div>
            )}
            {item.type === 'font' && (
                <div className="space-y-2">
                     <input type="text" value={dirtyItem.value} onChange={e => setDirtyItem(p => ({...p, value: e.target.value}))} placeholder="Font Family Name" className="w-full text-sm bg-dark-input p-2 rounded-md" />
                     <input type="text" value={dirtyItem.url || ''} onChange={e => setDirtyItem(p => ({...p, url: e.target.value || undefined}))} placeholder="Font URL (e.g., from Google Fonts)" className="w-full text-sm bg-dark-input p-2 rounded-md" />
                </div>
            )}
             <TagInput tags={dirtyItem.tags} onTagsChange={newTags => setDirtyItem(p => ({...p, tags: newTags}))} />
             <div className="flex gap-2 pt-2">
                <button onClick={handleCancel} className="flex-1 text-center text-xs font-semibold bg-dark-border py-1.5 rounded-md hover:opacity-80">Cancel</button>
                <button onClick={handleSave} className="flex-1 text-center text-xs font-semibold bg-brand-secondary text-white py-1.5 rounded-md hover:bg-purple-700">Save</button>
            </div>
         </div>
    );
    
    return (
        <div className="bg-dark-surface rounded-lg border border-dark-border flex flex-col h-full">
            {isEditing ? renderEditFields() : (
                 <>
                    <div className="p-3">
                        <div className="flex justify-between items-start">
                             <div className="flex-1 pr-2">
                                <p className="font-bold truncate" title={item.name}>{item.name}</p>
                                <p className="text-xs uppercase text-dark-text-secondary">{item.type}</p>
                             </div>
                             <div className="flex items-center">
                                <button onClick={() => setIsEditing(true)} className="p-1 rounded-full hover:bg-dark-input"><PencilIcon className="w-4 h-4 text-dark-text-secondary"/></button>
                                <button onClick={onDelete} className="p-1 rounded-full hover:bg-dark-input"><TrashIcon className="w-4 h-4 text-dark-text-secondary"/></button>
                             </div>
                        </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-center items-center min-h-[10rem]">{renderContent()}</div>
                    <div className="p-3 mt-auto border-t border-dark-border/50">
                         <div className="flex flex-wrap gap-1">
                            {item.tags.length > 0 ? item.tags.map(tag => (
                                <span key={tag} className="bg-dark-input text-dark-text-secondary text-xs px-2 py-0.5 rounded-full">{tag}</span>
                            )) : <span className="text-dark-text-secondary text-xs italic">No tags</span>}
                        </div>
                    </div>
                 </>
            )}
        </div>
    )
};

// --- Editor Component ---

const BrandKitEditor: React.FC<{ kitId: string; onBack: () => void }> = ({ kitId, onBack }) => {
    const { updateBrandKit } = useAppStore();
    const kit = useAppStore(state => state.brandKits.find(k => k.id === kitId));

    const [kitName, setKitName] = useState(kit?.name || '');
    const [primaryColor, setPrimaryColor] = useState(kit?.primaryColor || '#053736');

    useEffect(() => {
        if (!kit) {
            onBack();
        }
    }, [kit, onBack]);
    
    useEffect(() => {
        setKitName(kit?.name || '');
        setPrimaryColor(kit?.primaryColor || '#053736');
    }, [kit]);
    
    if (!kit) return null;

    const handleNameBlur = () => {
        if (kit.name !== kitName.trim() && kitName.trim()) {
            updateBrandKit(kit.id, { name: kitName.trim() });
        } else {
            setKitName(kit.name);
        }
    };
    
    const handleColorChange = (color: string) => {
        setPrimaryColor(color);
        updateBrandKit(kit.id, { primaryColor: color });
    };

    const handleAddItem = async (type: BrandKitItemType) => {
        let newItem: Omit<BrandKitItem, 'id'> = { type, name: `New ${type}`, value: '', tags: [type] };

        if (type === 'logo') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/png, image/jpeg, image/webp, image/svg+xml';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const { base64, mimeType } = await fileToBase64(file);
                    newItem.value = `data:${mimeType};base64,${base64}`;
                    newItem.name = file.name.split('.').slice(0, -1).join('.') || `Logo ${kit.items.length + 1}`;
                    const updatedItems = [...kit.items, { ...newItem, id: `item_${Date.now()}` }];
                    updateBrandKit(kit.id, { items: updatedItems });
                }
            };
            input.click();
            return;
        }
        if (type === 'color') newItem.value = '#CCA95A';
        if (type === 'font') {
            newItem.name = "My Custom Font";
            newItem.value = 'Inter';
            newItem.url = 'https://rsms.me/inter/inter.css';
        }

        const updatedItems = [...kit.items, { ...newItem, id: `item_${Date.now()}` }];
        updateBrandKit(kit.id, { items: updatedItems });
    };

    const handleUpdateItem = (updatedItem: BrandKitItem) => {
        const updatedItems = kit.items.map(item => item.id === updatedItem.id ? updatedItem : item);
        updateBrandKit(kit.id, { items: updatedItems });
    };

    const handleDeleteItem = (itemId: string) => {
        if (window.confirm('Are you sure you want to delete this brand asset?')) {
            const updatedItems = kit.items.filter(item => item.id !== itemId);
            updateBrandKit(kit.id, { items: updatedItems });
        }
    };

    return (
         <div className="h-full flex flex-col">
            <header className="p-4 border-b border-dark-border flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ backgroundColor: primaryColor }}>
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="text-sm font-semibold bg-black/20 hover:bg-black/40 border border-white/20 px-3 py-1.5 rounded-md text-white">Back</button>
                    <input 
                        type="text" 
                        value={kitName} 
                        onChange={e => setKitName(e.target.value)} 
                        onBlur={handleNameBlur}
                        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                        className="text-xl font-bold bg-transparent focus:outline-none focus:ring-1 ring-white/50 rounded px-2 w-full truncate text-white placeholder-white/70"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="primary-color-picker" className="text-sm font-semibold text-white">Primary Color</label>
                    <div className="relative w-8 h-8">
                         <input
                            id="primary-color-picker"
                            type="color"
                            value={primaryColor}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-8 h-8 rounded-md border-2 border-white/50" style={{ backgroundColor: primaryColor }}></div>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                 <div className="p-4 border-2 border-dashed border-dark-border rounded-lg flex flex-col sm:flex-row items-center justify-center gap-3">
                    <p className="font-semibold text-dark-text-secondary flex-shrink-0">Add to kit:</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <button onClick={() => handleAddItem('logo')} className="text-sm font-semibold bg-dark-input hover:bg-dark-border px-3 py-1.5 rounded-md">Logo</button>
                        <button onClick={() => handleAddItem('color')} className="text-sm font-semibold bg-dark-input hover:bg-dark-border px-3 py-1.5 rounded-md">Color</button>
                        <button onClick={() => handleAddItem('font')} className="text-sm font-semibold bg-dark-input hover:bg-dark-border px-3 py-1.5 rounded-md">Font</button>
                    </div>
                </div>
                 <h3 className="font-bold text-dark-text-secondary text-sm uppercase tracking-wider">Logos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {kit.items.filter(i => i.type === 'logo').map(item => (
                        <BrandKitItemCard key={item.id} item={item} onUpdate={handleUpdateItem} onDelete={() => handleDeleteItem(item.id)} />
                    ))}
                </div>
                 <h3 className="font-bold text-dark-text-secondary text-sm uppercase tracking-wider">Colors</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {kit.items.filter(i => i.type === 'color').map(item => (
                        <BrandKitItemCard key={item.id} item={item} onUpdate={handleUpdateItem} onDelete={() => handleDeleteItem(item.id)} />
                    ))}
                </div>
                 <h3 className="font-bold text-dark-text-secondary text-sm uppercase tracking-wider">Fonts</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {kit.items.filter(i => i.type === 'font').map(item => (
                        <BrandKitItemCard key={item.id} item={item} onUpdate={handleUpdateItem} onDelete={() => handleDeleteItem(item.id)} />
                    ))}
                </div>
            </main>
        </div>
    );
}

const BrandGuideCard: React.FC<{ kit: BrandKit; onClick: () => void; onDelete: () => void; }> = ({ kit, onClick, onDelete }) => {
    const logo = useMemo(() => kit.items.find(i => i.type === 'logo'), [kit.items]);
    const colors = useMemo(() => kit.items.filter(i => i.type === 'color').slice(0, 5), [kit.items]);
    const font = useMemo(() => kit.items.find(i => i.type === 'font'), [kit.items]);

    useEffect(() => {
        if (font?.url) {
            loadFont(font.value, font.url);
        }
    }, [font]);
    
    return (
        <div className="group relative rounded-2xl text-white overflow-hidden aspect-[4/3] cursor-pointer" onClick={onClick}>
            <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105" style={{ backgroundColor: kit.primaryColor || '#053736' }}></div>
             <div className="absolute inset-0 p-4 sm:p-6 grid grid-cols-2 grid-rows-2 gap-4">
                {/* Logo Section */}
                <div className="col-span-1 row-span-1 flex flex-col justify-center items-start border-r border-b border-white/10 pr-4 pb-4">
                    <h3 className="font-bold text-sm sm:text-base text-white/80" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)'}}>Logo</h3>
                    <div className="flex-1 w-full flex items-center justify-center p-2">
                        {logo ? <img src={logo.value} className="max-w-full max-h-full object-contain" alt={logo.name}/> : <p className="text-xs text-white/50">No Logo</p>}
                    </div>
                </div>

                {/* Typography Section */}
                 <div className="col-span-1 row-span-2 flex flex-col justify-center items-start pl-4">
                    <h3 className="font-bold text-sm sm:text-base text-white/80" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)'}}>Typography</h3>
                    {font ? (
                        <div className="flex-1 w-full flex flex-col justify-center">
                            <p className="text-2xl sm:text-4xl lg:text-5xl font-bold truncate" style={{ fontFamily: `'${font.value}', sans-serif` }}>Aa</p>
                            <p className="text-xs sm:text-sm text-white/70 truncate">{font.value}</p>
                        </div>
                    ) : <p className="text-xs text-white/50">No Font</p>}
                </div>

                 {/* Color Section */}
                <div className="col-span-1 row-span-1 flex flex-col justify-center items-start border-r border-t border-white/10 pr-4 pt-4">
                     <h3 className="font-bold text-sm sm:text-base text-white/80" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)'}}>Color Palette</h3>
                     <div className="flex-1 w-full flex items-center gap-2">
                         {colors.length > 0 ? colors.map(c => (
                            <div key={c.id} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/20" style={{ backgroundColor: c.value }} title={c.value}></div>
                         )) : <p className="text-xs text-white/50">No Colors</p>}
                     </div>
                </div>
            </div>
            <div className="absolute top-0 left-0 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)'}}>{kit.name}</h2>
            </div>
             <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/20 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/40 hover:text-white transition-all"
            >
                <TrashIcon className="w-4 h-4"/>
            </button>
        </div>
    );
};


// --- Main Tab Component ---

const BrandKitTab: React.FC = () => {
    const { brandKits, addBrandKit, deleteBrandKit } = useAppStore();
    const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
    const [newKitName, setNewKitName] = useState('');

    const handleAddKit = () => {
        if (newKitName.trim()) {
            addBrandKit(newKitName.trim()).then(newKit => {
                setSelectedKitId(newKit.id);
            });
            setNewKitName('');
        }
    };
    
    if (selectedKitId) {
        return <BrandKitEditor kitId={selectedKitId} onBack={() => setSelectedKitId(null)} />
    }

    return (
        <div className="w-full h-full flex flex-col">
            <header className="p-4 border-b border-dark-border flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-xl font-bold">Brand Kits</h1>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        value={newKitName}
                        onChange={e => setNewKitName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddKit()}
                        placeholder="New kit name..."
                        className="w-full sm:w-auto flex-grow text-sm rounded-lg border-dark-border bg-dark-input p-2"
                    />
                     <button onClick={handleAddKit} disabled={!newKitName.trim()} className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold bg-brand-primary text-white rounded-md hover:bg-brand-secondary disabled:opacity-50 flex-shrink-0">
                        <PlusIcon className="w-4 h-4"/> Create Kit
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                {brandKits.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {brandKits.map(kit => (
                            <BrandGuideCard 
                                key={kit.id}
                                kit={kit}
                                onClick={() => setSelectedKitId(kit.id)}
                                onDelete={() => {
                                     if (window.confirm(`Are you sure you want to delete the "${kit.name}" brand kit? This cannot be undone.`)) {
                                         deleteBrandKit(kit.id);
                                     }
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <PaletteIcon className="w-24 h-24 text-dark-text-secondary opacity-50 mb-4" />
                        <h2 className="text-xl font-bold">No Brand Kits Found</h2>
                        <p className="mt-1 max-w-sm text-md text-dark-text-secondary">
                          Create your first brand kit to store logos, colors, and fonts for easy access.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default BrandKitTab;