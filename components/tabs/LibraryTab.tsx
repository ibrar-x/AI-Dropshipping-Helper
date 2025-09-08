import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../../store';
import { LibraryImage, Folder } from '../../types';
import { EmptyStateIllustration } from '../icons/EmptyStateIllustration';
import { downloadImage } from '../../utils/imageUtils';
import { DownloadIcon } from '../icons/DownloadIcon';
import { XIcon } from '../icons/XIcon';
import { BrushIcon } from '../icons/BrushIcon';
import { UpscaleIcon } from '../icons/UpscaleIcon';
import { MegaphoneIcon } from '../icons/MegaphoneIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { FolderIcon } from '../icons/FolderIcon';
import { HeartIcon } from '../icons/HeartIcon';
import { GridIcon } from '../icons/GridIcon';
import { ListIcon } from '../icons/ListIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { MoreVerticalIcon } from '../icons/MoreVerticalIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import ImageDetailModal from '../library/ImageDetailModal';
import { CheckIcon } from '../icons/CheckIcon';

// Simplified Popover for Folder actions
const PopoverMenu: React.FC<{ children: React.ReactNode, content: React.ReactNode }> = ({ children, content }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <div onClick={() => setIsOpen(o => !o)}>{children}</div>
            {isOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-dark-surface border border-dark-border rounded-md shadow-lg z-20">
                    {content}
                </div>
            )}
        </div>
    );
};

const LibrarySidebar: React.FC<{
    folders: Folder[];
    activeFolderId: string | null;
    setActiveFolderId: (id: string | null) => void;
    favoritesCount: number;
    imagesCount: number;
}> = ({ folders, activeFolderId, setActiveFolderId, favoritesCount, imagesCount }) => {
    const { addFolder, updateFolder, deleteFolder } = useAppStore();
    const [newFolderName, setNewFolderName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddFolder = () => {
        if (newFolderName.trim()) {
            addFolder(newFolderName.trim());
            setNewFolderName('');
            setIsAdding(false);
        }
    };
    
    return (
        <aside className="w-full md:w-60 bg-dark-surface border-b md:border-b-0 md:border-r border-dark-border p-2 flex-shrink-0">
            <nav className="space-y-1">
                <button onClick={() => setActiveFolderId(null)} className={`w-full flex items-center gap-3 p-2 rounded-md text-sm font-semibold ${activeFolderId === null ? 'bg-dark-input' : 'hover:bg-dark-input'}`}>
                    <FolderIcon className="w-5 h-5" /> All Images <span className="ml-auto text-xs text-dark-text-secondary">{imagesCount}</span>
                </button>
                <button onClick={() => setActiveFolderId('favorites')} className={`w-full flex items-center gap-3 p-2 rounded-md text-sm font-semibold ${activeFolderId === 'favorites' ? 'bg-dark-input' : 'hover:bg-dark-input'}`}>
                    <HeartIcon className="w-5 h-5" /> Favorites <span className="ml-auto text-xs text-dark-text-secondary">{favoritesCount}</span>
                </button>
                <div className="pt-2">
                    <h3 className="px-2 text-xs font-bold uppercase text-dark-text-secondary">Folders</h3>
                    {folders.map(folder => (
                        <button key={folder.id} onClick={() => setActiveFolderId(folder.id)} className={`w-full flex items-center gap-3 p-2 rounded-md text-sm font-semibold ${activeFolderId === folder.id ? 'bg-dark-input' : 'hover:bg-dark-input'}`}>
                           <FolderIcon className="w-5 h-5 flex-shrink-0"/> <span className="truncate flex-1 text-left">{folder.name}</span>
                        </button>
                    ))}
                </div>
                {isAdding ? (
                    <div className="p-2 space-y-2">
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
                            placeholder="New folder name..."
                            className="w-full text-sm rounded-md border-dark-border bg-dark-input p-2"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setIsAdding(false)} className="flex-1 text-xs bg-dark-border rounded p-1">Cancel</button>
                            <button onClick={handleAddFolder} className="flex-1 text-xs bg-brand-primary text-white rounded p-1">Save</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setIsAdding(true)} className="w-full flex items-center gap-3 p-2 rounded-md text-sm font-semibold text-dark-text-secondary hover:bg-dark-input">
                        <PlusIcon className="w-5 h-5" /> New Folder
                    </button>
                )}
            </nav>
        </aside>
    );
};


const LibraryImageCard: React.FC<{ image: LibraryImage; isSelected: boolean; onSelect: (id: string, shiftKey: boolean) => void; onDoubleClick: (id: string) => void; }> = ({ image, isSelected, onSelect, onDoubleClick }) => (
    <div className="relative group aspect-square" onClick={(e) => onSelect(image.id, e.shiftKey)} onDoubleClick={() => onDoubleClick(image.id)}>
        <img src={image.thumbnailSrc} alt={image.notes || 'Library asset'} className="w-full h-full object-cover rounded-lg border-2 transition-colors border-transparent group-hover:border-brand-primary" loading="lazy" />
        <div className={`absolute inset-0 bg-black/60 rounded-lg transition-opacity duration-300 pointer-events-none ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
        <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${isSelected ? 'bg-brand-primary border-brand-primary' : 'bg-dark-surface/50 border-white/50 group-hover:border-white'}`}>
            {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
        </div>
        {image.isFavorite && <HeartIcon className="absolute top-2 right-2 w-5 h-5 text-red-500 fill-current" />}
    </div>
);

const LibraryImageListItem: React.FC<{ image: LibraryImage; isSelected: boolean; onSelect: (id: string, shiftKey: boolean) => void; onDoubleClick: (id: string) => void; }> = ({ image, isSelected, onSelect, onDoubleClick }) => (
    <div
        onClick={(e) => onSelect(image.id, e.shiftKey)}
        onDoubleClick={() => onDoubleClick(image.id)}
        className={`flex items-center gap-4 p-2 rounded-md cursor-pointer ${isSelected ? 'bg-brand-primary/20' : 'hover:bg-dark-surface'}`}
    >
        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-brand-primary border-brand-primary' : 'border-dark-border'}`}>
            {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
        </div>
        <img src={image.thumbnailSrc} className="w-12 h-12 object-cover rounded-md flex-shrink-0" loading="lazy" />
        <div className="flex-1 truncate">
            <p className="font-semibold truncate">{image.id}</p>
            <p className="text-xs text-dark-text-secondary truncate">{image.notes || 'No notes'}</p>
        </div>
        <div className="flex-1 hidden md:block">
            <div className="flex flex-wrap gap-1">
                {image.tags?.slice(0, 3).map(tag => <span key={tag} className="text-xs bg-dark-input px-2 py-0.5 rounded-full">{tag}</span>)}
            </div>
        </div>
        <p className="text-sm text-dark-text-secondary hidden sm:block w-32 text-right">{new Date(image.createdAt).toLocaleDateString()}</p>
    </div>
);

const BulkActionsBar: React.FC<{ selectedIds: string[]; onClear: () => void; }> = ({ selectedIds, onClear }) => {
    const { deleteImages, updateImage } = useAppStore();
    const folders = useAppStore(state => state.folders);

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} image(s)? This cannot be undone.`)) {
            deleteImages(selectedIds);
            onClear();
        }
    }
    
    const handleMove = (folderId: string | null) => {
        selectedIds.forEach(id => updateImage(id, { folderId }));
        onClear();
    }

    return (
        <div className="w-full p-2 border-t border-dark-border bg-dark-surface flex justify-between items-center animate-fade-in">
            <p className="text-sm font-semibold">{selectedIds.length} item(s) selected</p>
            <div className="flex items-center gap-2">
                <PopoverMenu content={
                    <div className="py-1">
                        <button onClick={() => handleMove(null)} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-dark-input">Move to Root</button>
                        {folders.map(f => (
                            <button key={f.id} onClick={() => handleMove(f.id)} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-dark-input">{f.name}</button>
                        ))}
                    </div>
                }>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md">
                        <FolderIcon className="w-4 h-4" /> Move
                    </button>
                </PopoverMenu>
                <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/30 rounded-md">
                    <TrashIcon className="w-4 h-4" /> Delete
                </button>
                <button onClick={onClear} className="p-2 hover:bg-dark-input rounded-md"><XIcon className="w-5 h-5" /></button>
            </div>
        </div>
    );
};


const LibraryTab: React.FC = () => {
    const { library, folders } = useAppStore();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sort, setSort] = useState<'createdAt-desc' | 'createdAt-asc'>('createdAt-desc');
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [detailImageId, setDetailImageId] = useState<string | null>(null);
    const lastSelectedIdRef = useRef<string | null>(null);

    const favoritesCount = useMemo(() => library.filter(img => img.isFavorite).length, [library]);

    const filteredAndSortedLibrary = useMemo(() => {
        let items = [...library];
        
        // Filter by folder
        if (activeFolderId === 'favorites') {
            items = items.filter(img => img.isFavorite);
        } else if (activeFolderId) {
            items = items.filter(img => img.folderId === activeFolderId);
        }

        // Filter by search term
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            items = items.filter(img =>
                img.notes?.toLowerCase().includes(lowercasedTerm) ||
                img.tags?.some(tag => tag.toLowerCase().includes(lowercasedTerm)) ||
                img.id.toLowerCase().includes(lowercasedTerm)
            );
        }

        // Sort
        items.sort((a, b) => {
            if (sort === 'createdAt-desc') return b.createdAt - a.createdAt;
            return a.createdAt - b.createdAt;
        });

        return items;
    }, [library, activeFolderId, searchTerm, sort]);

    const handleSelect = useCallback((id: string, shiftKey: boolean) => {
        const lastIndex = lastSelectedIdRef.current ? filteredAndSortedLibrary.findIndex(img => img.id === lastSelectedIdRef.current) : -1;
        const currentIndex = filteredAndSortedLibrary.findIndex(img => img.id === id);

        if (shiftKey && lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const inBetweenIds = filteredAndSortedLibrary.slice(start, end + 1).map(img => img.id);
            
            setSelectedIds(prev => {
                const newSelection = new Set([...prev, ...inBetweenIds]);
                return Array.from(newSelection);
            });
        } else {
             setSelectedIds(prev =>
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
        }
        lastSelectedIdRef.current = id;
    }, [filteredAndSortedLibrary]);

    const handleDoubleClick = (id: string) => {
        setDetailImageId(id);
    };

    return (
        <div className="flex flex-col md:flex-row h-full w-full bg-dark-bg text-dark-text-primary">
            <LibrarySidebar 
                folders={folders} 
                activeFolderId={activeFolderId}
                setActiveFolderId={setActiveFolderId}
                favoritesCount={favoritesCount}
                imagesCount={library.length}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="p-2 border-b border-dark-border flex-shrink-0 flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-secondary"/>
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search notes, tags..." className="w-full bg-dark-input border border-dark-border rounded-md pl-10 pr-4 py-2 text-sm"/>
                    </div>
                    <select value={sort} onChange={e => setSort(e.target.value as any)} className="bg-dark-input border border-dark-border rounded-md px-3 py-2 text-sm">
                        <option value="createdAt-desc">Newest First</option>
                        <option value="createdAt-asc">Oldest First</option>
                    </select>
                    <div className="flex items-center bg-dark-input border border-dark-border rounded-md p-1">
                        <button onClick={() => setView('grid')} className={`p-1.5 rounded ${view === 'grid' ? 'bg-dark-surface' : ''}`}><GridIcon className="w-5 h-5"/></button>
                        <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? 'bg-dark-surface' : ''}`}><ListIcon className="w-5 h-5"/></button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4">
                    {filteredAndSortedLibrary.length > 0 ? (
                        view === 'grid' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                                {filteredAndSortedLibrary.map(image => (
                                    <LibraryImageCard key={image.id} image={image} isSelected={selectedIds.includes(image.id)} onSelect={handleSelect} onDoubleClick={handleDoubleClick} />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredAndSortedLibrary.map(image => (
                                    <LibraryImageListItem key={image.id} image={image} isSelected={selectedIds.includes(image.id)} onSelect={handleSelect} onDoubleClick={handleDoubleClick} />
                                ))}
                            </div>
                        )
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full text-center">
                            <EmptyStateIllustration className="w-48 h-48" />
                            <h2 className="mt-4 text-xl font-bold">Library is Empty</h2>
                            <p className="mt-1 max-w-sm text-md text-dark-text-secondary">
                              Use the tools in the sidebar to generate new images, and they will appear here automatically.
                            </p>
                         </div>
                    )}
                </main>
                 {selectedIds.length > 0 && (
                    <div className="flex-shrink-0">
                        <BulkActionsBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />
                    </div>
                )}
            </div>
            {detailImageId && <ImageDetailModal imageId={detailImageId} onClose={() => setDetailImageId(null)} />}
        </div>
    );
};

export default LibraryTab;