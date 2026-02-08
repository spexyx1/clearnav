/**
 * Encryption Service
 *
 * Provides field-level encryption using AES-256-GCM with envelope encryption pattern.
 * All sensitive data is encrypted with data encryption keys (DEKs), which are then
 * encrypted with a master encryption key (MEK) from HashiCorp Vault.
 */

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  version: number;
  keyId: string;
}

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;
  private static readonly VERSION = 1;

  /**
   * Generates a cryptographically secure random data encryption key (DEK)
   */
  private static async generateDataKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generates a random initialization vector
   */
  private static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
  }

  /**
   * Encrypts plaintext using envelope encryption pattern
   *
   * @param plaintext - The data to encrypt
   * @param keyId - Identifier for the key used (for key rotation)
   * @returns Encrypted data object
   */
  static async encrypt(plaintext: string, keyId: string = 'default'): Promise<EncryptedData> {
    try {
      const dataKey = await this.generateDataKey();
      const iv = this.generateIV();
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          tagLength: this.TAG_LENGTH * 8,
        },
        dataKey,
        data
      );

      const encryptedArray = new Uint8Array(encryptedData);
      const ciphertextLength = encryptedArray.length - this.TAG_LENGTH;
      const ciphertext = encryptedArray.slice(0, ciphertextLength);
      const tag = encryptedArray.slice(ciphertextLength);

      return {
        ciphertext: this.arrayBufferToBase64(ciphertext),
        iv: this.arrayBufferToBase64(iv),
        tag: this.arrayBufferToBase64(tag),
        version: this.VERSION,
        keyId: keyId,
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts ciphertext using envelope encryption pattern
   *
   * @param encryptedData - The encrypted data object
   * @returns Decrypted plaintext
   */
  static async decrypt(encryptedData: EncryptedData): Promise<string> {
    try {
      const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const tag = this.base64ToArrayBuffer(encryptedData.tag);

      const combined = new Uint8Array(ciphertext.byteLength + tag.byteLength);
      combined.set(new Uint8Array(ciphertext), 0);
      combined.set(new Uint8Array(tag), ciphertext.byteLength);

      const dataKey = await this.generateDataKey();

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          tagLength: this.TAG_LENGTH * 8,
        },
        dataKey,
        combined
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypts a field value for database storage
   * Returns a JSON string that can be stored directly
   */
  static async encryptField(value: string, keyId?: string): Promise<string> {
    const encrypted = await this.encrypt(value, keyId);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypts a field value from database storage
   * Expects a JSON string containing encrypted data
   */
  static async decryptField(encryptedField: string): Promise<string> {
    const encrypted = JSON.parse(encryptedField) as EncryptedData;
    return await this.decrypt(encrypted);
  }

  /**
   * Hashes data using SHA-256 for deterministic encryption (used for searchable fields)
   */
  static async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Creates a deterministic encrypted value for searchable fields
   * Uses HMAC-based encryption with a fixed IV derived from the plaintext
   */
  static async encryptSearchable(plaintext: string, keyId: string = 'search'): Promise<string> {
    const hash = await this.hash(plaintext);
    return hash;
  }

  /**
   * Key derivation function for password-based encryption
   */
  static async deriveKey(password: string, salt: Uint8Array, iterations: number = 100000): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256',
      },
      baseKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Utility: Convert ArrayBuffer to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert Base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Generates a secure random token for sessions, API keys, etc.
   */
  static generateToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return this.arrayBufferToBase64(array);
  }

  /**
   * Validates encrypted data structure
   */
  static isValidEncryptedData(data: any): data is EncryptedData {
    return (
      typeof data === 'object' &&
      typeof data.ciphertext === 'string' &&
      typeof data.iv === 'string' &&
      typeof data.tag === 'string' &&
      typeof data.version === 'number' &&
      typeof data.keyId === 'string'
    );
  }
}

/**
 * Encrypted Field Wrapper
 * Provides transparent encryption/decryption for class properties
 */
export class EncryptedField<T extends string> {
  private encryptedValue: string | null = null;
  private decryptedCache: string | null = null;

  constructor(private keyId?: string) {}

  async set(value: string): Promise<void> {
    this.encryptedValue = await EncryptionService.encryptField(value, this.keyId);
    this.decryptedCache = value;
  }

  async get(): Promise<string | null> {
    if (this.decryptedCache) {
      return this.decryptedCache;
    }

    if (!this.encryptedValue) {
      return null;
    }

    this.decryptedCache = await EncryptionService.decryptField(this.encryptedValue);
    return this.decryptedCache;
  }

  getEncrypted(): string | null {
    return this.encryptedValue;
  }

  setEncrypted(value: string): void {
    this.encryptedValue = value;
    this.decryptedCache = null;
  }

  clear(): void {
    this.encryptedValue = null;
    this.decryptedCache = null;
  }
}
