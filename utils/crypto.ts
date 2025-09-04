// This is a simple XOR cipher for obfuscation, not for true security.
// The key is hardcoded client-side, so this is easily reversible.
const SECRET_KEY = 'a-very-secret-key-for-ai-product-studio';

export const encrypt = (text: string): string => {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result); // Base64 encode to make it safe for localStorage
};

export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return '';
  try {
    const rawText = atob(encryptedText);
    let result = '';
    for (let i = 0; i < rawText.length; i++) {
      const charCode = rawText.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (error) {
    console.error("Decryption failed:", error);
    // If decryption fails (e.g., malformed base64 from old data), clear it.
    localStorage.removeItem('userApiKey');
    return '';
  }
};
