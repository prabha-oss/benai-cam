/**
 * AES-256-GCM Encryption utilities for sensitive data (API keys, credentials)
 * Uses Web Crypto API for browser compatibility
 */

// Encryption configuration
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits

/**
 * Generate a random encryption key (for initial setup)
 */
export async function generateEncryptionKey(): Promise<string> {
    const key = await crypto.subtle.generateKey(
        { name: ALGORITHM, length: KEY_LENGTH },
        true,
        ['encrypt', 'decrypt']
    );

    const exported = await crypto.subtle.exportKey('raw', key);
    return bufferToHex(new Uint8Array(exported));
}

/**
 * Import a hex key string into a CryptoKey
 */
async function importKey(keyHex: string): Promise<CryptoKey> {
    const keyBytes = hexToBuffer(keyHex);
    // Create a new ArrayBuffer (slice ensures we get an ArrayBuffer, not SharedArrayBuffer)
    const keyBuffer = keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer;
    return crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a plaintext string
 * Returns a base64-encoded string containing: IV + ciphertext + auth tag
 */
export async function encrypt(plaintext: string, keyHex: string): Promise<string> {
    const key = await importKey(keyHex);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encode plaintext
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
        key,
        data
    );

    // Combine IV + ciphertext for storage
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return bufferToBase64(combined);
}

/**
 * Decrypt a ciphertext string
 * Expects base64-encoded string containing: IV + ciphertext + auth tag
 */
export async function decrypt(ciphertext: string, keyHex: string): Promise<string> {
    const key = await importKey(keyHex);

    // Decode from base64
    const combined = base64ToBuffer(ciphertext);

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
        key,
        encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

/**
 * Encrypt an object (JSON serializable)
 */
export async function encryptObject(obj: any, keyHex: string): Promise<string> {
    const json = JSON.stringify(obj);
    return encrypt(json, keyHex);
}

/**
 * Decrypt an object
 */
export async function decryptObject<T = any>(ciphertext: string, keyHex: string): Promise<T> {
    const json = await decrypt(ciphertext, keyHex);
    return JSON.parse(json);
}

// ================== Utility Functions ==================

function bufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBuffer(hex: string): Uint8Array {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
}

function bufferToBase64(buffer: Uint8Array): string {
    const binary = String.fromCharCode(...buffer);
    return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Hash a password or API key for comparison (not reversible)
 */
export async function hashValue(value: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return bufferToHex(new Uint8Array(hashBuffer));
}
