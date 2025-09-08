
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { EbayListing } from '../../types';
import { EbayIcon } from '../icons/EbayIcon';
import { getSellerOffers } from '../../services/ebayService';

const EbayTab: React.FC = () => {
    const { isEbayConnected, ebayAccountInfo, openSettings } = useAppStore();
    const [listings, setListings] = useState<EbayListing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchListings = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getSellerOffers();
            setListings(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch listings.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isEbayConnected) {
            fetchListings();
        }
    }, [isEbayConnected]);

    if (!isEbayConnected) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-dark-bg text-center">
                <EbayIcon className="w-24 h-24 mb-4" />
                <h1 className="text-3xl font-bold text-dark-text-primary">Connect Your eBay Account</h1>
                <p className="mt-2 max-w-md text-md text-dark-text-secondary">
                    Integrate your eBay store to create and manage listings directly from your AI-generated assets.
                </p>
                <button 
                    onClick={openSettings}
                    className="mt-8 px-6 py-3 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary transition-colors"
                >
                    Connect to eBay
                </button>
            </div>
        );
    }

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="ml-3 text-lg font-semibold">Fetching your listings...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center text-red-400">
                    <h2 className="text-xl font-bold">An Error Occurred</h2>
                    <p className="mt-2">{error}</p>
                    <button onClick={fetchListings} className="mt-4 px-4 py-2 bg-red-500/20 rounded-md">Try Again</button>
                </div>
            );
        }

        if (listings.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <h2 className="text-xl font-bold">No Listings Found</h2>
                    <p className="mt-2">We couldn't find any active listings for this account.</p>
                </div>
            );
        }
        
        return (
             <div className="space-y-3">
                {listings.map(listing => (
                    <div key={listing.offerId} className="bg-dark-surface p-3 rounded-lg border border-dark-border flex items-center gap-4">
                        <div className="w-16 h-16 bg-dark-input rounded-md flex-shrink-0 flex items-center justify-center">
                            {listing.imageUrl ? (
                                <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover rounded-md" />
                            ) : (
                                <EbayIcon className="w-8 h-8 opacity-50" />
                            )}
                        </div>
                        <div className="flex-1 truncate">
                            <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold truncate hover:underline">{listing.title || `SKU: ${listing.sku}`}</a>
                            <p className="text-sm text-dark-text-secondary">{listing.price}</p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${listing.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {listing.status}
                            </span>
                            <button className="px-3 py-1.5 text-xs font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md">Details</button>
                            <button className="px-3 py-1.5 text-xs font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md">Delist</button>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            <header className="p-4 border-b border-dark-border flex-shrink-0 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold">eBay Listings</h1>
                    <p className="text-sm text-dark-text-secondary">Connected as {ebayAccountInfo?.username}</p>
                </div>
                <button 
                    onClick={fetchListings}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md disabled:opacity-50"
                >
                    {isLoading ? 'Syncing...' : 'Sync Listings'}
                </button>
            </header>
            <main className="flex-1 overflow-y-auto p-4">
               {renderContent()}
            </main>
        </div>
    );
};

export default EbayTab;
