
import { useAppStore } from '../store';
import { EbayAuthTokens, EbayAccountInfo, EbayListing } from '../types';
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, EBAY_API_URL, EBAY_TOKEN_URL } from '../ebayConfig';
import { encrypt } from '../utils/crypto';

// --- Token Management ---

export const exchangeCodeForTokens = async (code: string): Promise<EbayAuthTokens> => {
    // Note: In a real app, this request would be blocked by CORS if called directly from the browser.
    // It must be proxied through a backend server which can securely add the Authorization header
    // and handle the CLIENT_SECRET without exposing it to the client.
    
    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('code', code);
    body.append('redirect_uri', REDIRECT_URI);

    const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

    const response = await fetch(EBAY_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
        },
        body: body.toString(),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || 'Failed to exchange authorization code for tokens.');
    }

    const data = await response.json();

    const now = Date.now();
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        accessTokenExpiry: now + data.expires_in * 1000,
        refreshTokenExpiry: now + data.refresh_token_expires_in * 1000,
    };
};

export const refreshAccessToken = async (refreshToken: string): Promise<EbayAuthTokens> => {
    // Similar to the token exchange, this should be proxied through a backend in a real app.
    const body = new URLSearchParams();
    body.append('grant_type', 'refresh_token');
    body.append('refresh_token', refreshToken);
    
    const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

    const response = await fetch(EBAY_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
        },
        body: body.toString(),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || 'Failed to refresh access token.');
    }

    const data = await response.json();
    const { ebayAuthTokens } = useAppStore.getState();

    const now = Date.now();
    return {
        accessToken: data.access_token,
        refreshToken: ebayAuthTokens?.refreshToken || '', // eBay doesn't always return a new refresh token
        accessTokenExpiry: now + data.expires_in * 1000,
        refreshTokenExpiry: ebayAuthTokens?.refreshTokenExpiry || 0,
    };
};

const getValidAccessToken = async (): Promise<string | null> => {
    let { ebayAuthTokens } = useAppStore.getState();

    if (!ebayAuthTokens) return null;

    if (Date.now() >= ebayAuthTokens.accessTokenExpiry) {
        // Access token expired, try to refresh
        try {
            const newTokens = await refreshAccessToken(ebayAuthTokens.refreshToken);
            const encryptedTokens = encrypt(JSON.stringify(newTokens));
            localStorage.setItem('ebay-auth-tokens', encryptedTokens);
            useAppStore.setState({ ebayAuthTokens: newTokens });
            return newTokens.accessToken;
        } catch (error) {
            console.error("Failed to refresh eBay token:", error);
            // If refresh fails, log the user out of eBay integration
            useAppStore.getState().disconnectEbay();
            return null;
        }
    }
    
    return ebayAuthTokens.accessToken;
};


// --- API Calls ---

const makeEbayApiCall = async (endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: any) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
        throw new Error("Not authenticated with eBay.");
    }
    
    // Note: Like other calls, this needs a CORS proxy in a real browser environment.
    const response = await fetch(`${EBAY_API_URL}${endpoint}`, {
        method,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.errors?.[0]?.message || 'eBay API request failed.');
        } catch {
            throw new Error('eBay API request failed with non-JSON response.');
        }
    }
    
    // Handle cases where response body might be empty (e.g., 204 No Content)
    if (response.status === 204) {
        return null;
    }

    return response.json();
};

export const getEbayUser = async (): Promise<EbayAccountInfo | null> => {
    try {
        const data = await makeEbayApiCall('/sell/account/v1/user');
        return { username: data.username };
    } catch (error) {
        console.error("Could not fetch eBay user info:", error);
        return null;
    }
};

export const getSellerOffers = async (limit: number = 20): Promise<EbayListing[]> => {
    const data = await makeEbayApiCall(`/sell/inventory/v1/offer?limit=${limit}`);
    if (!data || !data.offers) return [];

    // The API gives us offers, but we need to enrich them with details from the inventory item
    // For simplicity, we are only showing basic data here. A full implementation might
    // make additional calls to get inventory item details like title and image URL.
    return data.offers.map((offer: any): EbayListing => ({
        offerId: offer.offerId,
        listingId: offer.listing?.listingId,
        sku: offer.sku,
        status: offer.status,
        title: `SKU: ${offer.sku}`, // Placeholder title
        price: `${offer.pricingSummary?.price.value} ${offer.pricingSummary?.price.currency}`,
        listingUrl: offer.listing?.webUrl,
    }));
};

interface ListingPayload {
    title: string;
    description: string;
    price: string;
    condition: string;
    categoryId: string;
    imageUrl: string;
}

export const createEbayListing = async (payload: ListingPayload): Promise<void> => {
    // This is a highly complex, multi-step process. The following is a commented-out guide.
    // For this app, we will simulate success to keep the UX flowing.
    console.log("Simulating eBay listing creation with payload:", payload);

    /*
    // STEP 1: Upload the image to eBay Picture Services (EPS) or another host.
    // The Trading API's `UploadSiteHostedPictures` is commonly used for this.
    // This would involve a separate API call which returns a URL for the image.
    const hostedImageUrl = await uploadImageToEbay(payload.imageUrl); // This is a fictional function

    // STEP 2: Create or update an Inventory Item.
    // This represents the product itself. The SKU is the unique identifier.
    const sku = `PROD-${Date.now()}`;
    const inventoryItemPayload = {
        availability: {
            shipToLocationAvailability: {
                quantity: 1,
            },
        },
        condition: payload.condition,
        product: {
            title: payload.title,
            description: payload.description,
            imageUrls: [hostedImageUrl],
        },
    };
    await makeEbayApiCall(`/sell/inventory/v1/inventory_item/${sku}`, 'PUT', inventoryItemPayload);

    // STEP 3: Create an Offer.
    // This links the inventory item (SKU) to a price, marketplace, and format.
    const offerPayload = {
        sku: sku,
        marketplaceId: 'EBAY_GB', // Example: Great Britain
        format: 'FIXED_PRICE',
        pricingSummary: {
            price: {
                value: payload.price,
                currency: 'GBP',
            },
        },
        listingPolicies: {
            // These IDs would come from the seller's account settings
            fulfillmentPolicyId: 'YOUR_FULFILLMENT_POLICY_ID',
            paymentPolicyId: 'YOUR_PAYMENT_POLICY_ID',
            returnPolicyId: 'YOUR_RETURN_POLICY_ID',
        },
        categoryId: payload.categoryId,
    };
    const offerResponse = await makeEbayApiCall('/sell/inventory/v1/offer', 'POST', offerPayload);
    const offerId = offerResponse.offerId;

    // STEP 4: Publish the Offer to create the live listing.
    await makeEbayApiCall(`/sell/inventory/v1/offer/${offerId}/publish`, 'POST');
    */

    // Simulate a delay for the API calls
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // In a real scenario, you'd return the new listing ID or confirmation.
    return;
};
