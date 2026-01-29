// Encryption utilities for credential storage
// Uses Web Crypto API for secure encryption

export async function encryptCredential(value: string, secret: string): Promise<string> {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(value);

        // Derive a key from the secret
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            "PBKDF2",
            false,
            ["deriveBits", "deriveKey"]
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: encoder.encode("benai-cam-salt"), // In production, use random salt per credential
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        // Generate random IV
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Encrypt the data
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            data
        );

        // Combine IV and encrypted data
        const result = new Uint8Array(iv.length + encryptedData.byteLength);
        result.set(iv, 0);
        result.set(new Uint8Array(encryptedData), iv.length);

        // Convert to base64
        return btoa(String.fromCharCode.apply(null, Array.from(result)));
    } catch (error) {
        console.error("Encryption error:", error);
        throw new Error("Failed to encrypt credential");
    }
}

export async function decryptCredential(encrypted: string, secret: string): Promise<string> {
    try {
        const encoder = new TextEncoder();

        // Decode base64
        const encryptedData = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

        // Extract IV and data
        const iv = encryptedData.slice(0, 12);
        const data = encryptedData.slice(12);

        // Derive the same key
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            "PBKDF2",
            false,
            ["deriveBits", "deriveKey"]
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: encoder.encode("benai-cam-salt"),
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        // Decrypt
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            data
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
    } catch (error) {
        console.error("Decryption error:", error);
        throw new Error("Failed to decrypt credential");
    }
}

// Simple helper for client-side usage
export function getEncryptionSecret(): string {
    const secret = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET;
    if (!secret) {
        throw new Error("NEXT_PUBLIC_ENCRYPTION_SECRET is not set");
    }
    return secret;
}
