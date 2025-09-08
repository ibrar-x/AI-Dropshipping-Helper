
// !!! IMPORTANT SECURITY WARNING !!!
// In a real-world production application, the CLIENT_ID and especially the CLIENT_SECRET
// must be stored on a secure backend server. Exposing them in a client-side application
// is a significant security risk, as it allows unauthorized users to impersonate your application.
// This file is for demonstration purposes only within this client-side-only context.

// Replace with your actual eBay App ID (Client ID)
export const CLIENT_ID = 'YOUR_EBAY_CLIENT_ID_HERE'; 

// Replace with your actual eBay Client Secret
// WARNING: Do not commit this to a public repository.
export const CLIENT_SECRET = 'YOUR_EBAY_CLIENT_SECRET_HERE';

// This must exactly match one of the "Accepted redirect URIs" you configured in your eBay application settings.
export const REDIRECT_URI = window.location.origin + window.location.pathname;

// These are the permissions your application will request from the user.
export const SCOPES = [
    'https://api.ebay.com/oauth/api_scope', // General access scope
    'https://api.ebay.com/oauth/api_scope/sell.inventory', // For managing inventory and offers
    'https://api.ebay.com/oauth/api_scope/sell.account', // For account information
    'https://api.ebay.com/oauth/api_scope/sell.marketing', // For managing promotions (optional)
];

// URLs for eBay API endpoints
export const EBAY_AUTH_URL = 'https://auth.ebay.com/oauth2/authorize';
export const EBAY_TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
export const EBAY_API_URL = 'https://api.ebay.com';

