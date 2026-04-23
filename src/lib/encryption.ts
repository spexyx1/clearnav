/**
 * Encryption utilities using the Web Crypto API.
 *
 * AES-256-GCM with a per-call password-derived key.
 * For persistent storage a stable passphrase must be supplied so the same
 * key can be re-derived for decryption.
 */

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  version: number;
}

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;
const VERSION = 2;

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt plaintext with a stable passphrase. Store the returned object as JSON. */
export async function encrypt(plaintext: string, passphrase: string): Promise<EncryptedData> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, enc.encode(plaintext));
  return {
    ciphertext: bufToBase64(cipherBuf),
    iv: bufToBase64(iv),
    salt: bufToBase64(salt),
    version: VERSION,
  };
}

/** Decrypt an EncryptedData object with the same passphrase used to encrypt. */
export async function decrypt(data: EncryptedData, passphrase: string): Promise<string> {
  const salt = new Uint8Array(base64ToBuf(data.salt));
  const iv = base64ToBuf(data.iv);
  const key = await deriveKey(passphrase, salt);
  const plainBuf = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    base64ToBuf(data.ciphertext)
  );
  return new TextDecoder().decode(plainBuf);
}

/** Convenience: encrypt to JSON string for DB storage. */
export async function encryptField(value: string, passphrase: string): Promise<string> {
  return JSON.stringify(await encrypt(value, passphrase));
}

/** Convenience: decrypt from JSON string stored in DB. */
export async function decryptField(stored: string, passphrase: string): Promise<string> {
  return decrypt(JSON.parse(stored) as EncryptedData, passphrase);
}

/** SHA-256 hash of data — for use as a deterministic identifier, NOT for password storage. */
export async function hash(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return bufToBase64(buf);
}

/** Cryptographically secure random token (URL-safe base64). */
export function generateToken(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bufToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Type guard for EncryptedData. */
export function isEncryptedData(v: unknown): v is EncryptedData {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as EncryptedData).ciphertext === 'string' &&
    typeof (v as EncryptedData).iv === 'string' &&
    typeof (v as EncryptedData).salt === 'string' &&
    typeof (v as EncryptedData).version === 'number'
  );
}
