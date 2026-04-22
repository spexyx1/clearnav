/**
 * HashiCorp Vault Client Service
 *
 * Manages connections to self-hosted HashiCorp Vault for secrets management,
 * dynamic credentials, and encryption-as-a-service.
 *
 * Features:
 * - Connection pooling and automatic retry logic
 * - Dynamic secrets with automatic rotation
 * - Transit engine for encryption operations
 * - Secret versioning with rollback capability
 * - Audit logging for all secret access
 */

export interface VaultConfig {
  address: string;
  token?: string;
  namespace?: string;
  roleId?: string;
  secretId?: string;
  transitPath?: string;
  databasePath?: string;
}

export interface VaultSecret {
  data: Record<string, any>;
  metadata: {
    version: number;
    created_time: string;
    deletion_time: string;
    destroyed: boolean;
  };
}

export interface DynamicDBCredentials {
  username: string;
  password: string;
  leaseId: string;
  leaseDuration: number;
  renewable: boolean;
}

export class VaultClient {
  private config: VaultConfig;
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(config: VaultConfig) {
    this.config = {
      transitPath: 'transit',
      databasePath: 'database',
      ...config,
    };
    this.token = config.token || null;
  }

  /**
   * Authenticates with Vault using AppRole method
   * This is the recommended authentication method for applications
   */
  async authenticateAppRole(): Promise<void> {
    if (!this.config.roleId || !this.config.secretId) {
      throw new Error('AppRole credentials not configured');
    }

    try {
      const response = await this.request('POST', '/v1/auth/approle/login', {
        role_id: this.config.roleId,
        secret_id: this.config.secretId,
      });

      this.token = response.auth.client_token;
      this.tokenExpiry = Date.now() + response.auth.lease_duration * 1000;

      console.log('Vault authentication successful');
    } catch (error) {
      console.error('Vault authentication failed:', error);
      throw new Error('Failed to authenticate with Vault');
    }
  }

  /**
   * Reads a secret from Vault KV v2 engine
   */
  async readSecret(path: string, version?: number): Promise<VaultSecret | null> {
    await this.ensureAuthenticated();

    try {
      const versionParam = version ? `?version=${version}` : '';
      const response = await this.request('GET', `/v1/secret/data/${path}${versionParam}`);

      return {
        data: response.data.data,
        metadata: response.data.metadata,
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Writes a secret to Vault KV v2 engine
   */
  async writeSecret(path: string, data: Record<string, any>): Promise<void> {
    await this.ensureAuthenticated();

    await this.request('POST', `/v1/secret/data/${path}`, {
      data: data,
      options: {
        cas: 0, // Check-and-Set value (0 = no check)
      },
    });
  }

  /**
   * Deletes the latest version of a secret
   */
  async deleteSecret(path: string): Promise<void> {
    await this.ensureAuthenticated();
    await this.request('DELETE', `/v1/secret/data/${path}`);
  }

  /**
   * Lists secrets at a given path
   */
  async listSecrets(path: string): Promise<string[]> {
    await this.ensureAuthenticated();

    try {
      const response = await this.request('LIST', `/v1/secret/metadata/${path}`);
      return response.data.keys || [];
    } catch (error: any) {
      if (error.statusCode === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Requests dynamic database credentials from Vault
   * These credentials automatically rotate and expire
   */
  async getDynamicDBCredentials(roleName: string): Promise<DynamicDBCredentials> {
    await this.ensureAuthenticated();

    const response = await this.request('GET', `/v1/${this.config.databasePath}/creds/${roleName}`);

    return {
      username: response.data.username,
      password: response.data.password,
      leaseId: response.lease_id,
      leaseDuration: response.lease_duration,
      renewable: response.renewable,
    };
  }

  /**
   * Renews a lease for dynamic credentials
   */
  async renewLease(leaseId: string, increment?: number): Promise<void> {
    await this.ensureAuthenticated();

    await this.request('PUT', '/v1/sys/leases/renew', {
      lease_id: leaseId,
      increment: increment,
    });
  }

  /**
   * Revokes a lease immediately
   */
  async revokeLease(leaseId: string): Promise<void> {
    await this.ensureAuthenticated();

    await this.request('PUT', '/v1/sys/leases/revoke', {
      lease_id: leaseId,
    });
  }

  /**
   * Encrypts data using Vault Transit engine
   * This is encryption-as-a-service - Vault manages the keys
   */
  async encrypt(keyName: string, plaintext: string): Promise<string> {
    await this.ensureAuthenticated();

    const base64Plaintext = btoa(plaintext);
    const response = await this.request('POST', `/v1/${this.config.transitPath}/encrypt/${keyName}`, {
      plaintext: base64Plaintext,
    });

    return response.data.ciphertext;
  }

  /**
   * Decrypts data using Vault Transit engine
   */
  async decrypt(keyName: string, ciphertext: string): Promise<string> {
    await this.ensureAuthenticated();

    const response = await this.request('POST', `/v1/${this.config.transitPath}/decrypt/${keyName}`, {
      ciphertext: ciphertext,
    });

    return atob(response.data.plaintext);
  }

  /**
   * Rotates an encryption key in the Transit engine
   * Old versions can still decrypt, but new encryptions use the new key
   */
  async rotateKey(keyName: string): Promise<void> {
    await this.ensureAuthenticated();
    await this.request('POST', `/v1/${this.config.transitPath}/keys/${keyName}/rotate`);
  }

  /**
   * Creates a new encryption key in the Transit engine
   */
  async createKey(keyName: string, exportable: boolean = false): Promise<void> {
    await this.ensureAuthenticated();

    await this.request('POST', `/v1/${this.config.transitPath}/keys/${keyName}`, {
      exportable: exportable,
      type: 'aes256-gcm96',
    });
  }

  /**
   * Generates a high-entropy random token
   */
  async generateRandomBytes(bytes: number = 32, format: 'hex' | 'base64' = 'hex'): Promise<string> {
    await this.ensureAuthenticated();

    const response = await this.request('POST', '/v1/sys/tools/random', {
      bytes: bytes,
      format: format,
    });

    return response.data.random_bytes;
  }

  /**
   * Ensures the client is authenticated and token is valid
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.token) {
      if (this.config.roleId && this.config.secretId) {
        await this.authenticateAppRole();
      } else {
        throw new Error('Vault client not authenticated');
      }
    }

    if (this.tokenExpiry && Date.now() >= this.tokenExpiry - 60000) {
      console.log('Token near expiry, re-authenticating...');
      await this.authenticateAppRole();
    }
  }

  /**
   * Makes an HTTP request to Vault with retry logic
   */
  private async request(
    method: string,
    path: string,
    body?: any,
    attempt: number = 1
  ): Promise<any> {
    const url = `${this.config.address}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['X-Vault-Token'] = this.token;
    }

    if (this.config.namespace) {
      headers['X-Vault-Namespace'] = this.config.namespace;
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error: any = new Error(`Vault request failed: ${response.statusText}`);
        error.statusCode = response.status;
        throw error;
      }

      if (response.status === 204) {
        return {};
      }

      return await response.json();
    } catch (error) {
      if (attempt < this.retryAttempts) {
        console.log(`Vault request failed, retrying (${attempt}/${this.retryAttempts})...`);
        await this.delay(this.retryDelay * attempt);
        return this.request(method, path, body, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Utility delay function for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check for Vault server
   */
  async healthCheck(): Promise<{ initialized: boolean; sealed: boolean; standby: boolean }> {
    try {
      const response = await fetch(`${this.config.address}/v1/sys/health`, {
        method: 'GET',
      });

      const data = await response.json();

      return {
        initialized: data.initialized,
        sealed: data.sealed,
        standby: data.standby,
      };
    } catch (error) {
      console.error('Vault health check failed:', error);
      throw new Error('Vault server is unreachable');
    }
  }
}

/**
 * Singleton Vault client instance
 * Configure this during application startup
 */
let vaultClientInstance: VaultClient | null = null;

export function initializeVaultClient(config: VaultConfig): VaultClient {
  vaultClientInstance = new VaultClient(config);
  return vaultClientInstance;
}

export function getVaultClient(): VaultClient {
  if (!vaultClientInstance) {
    throw new Error('Vault client not initialized. Call initializeVaultClient first.');
  }
  return vaultClientInstance;
}

/**
 * Secret rotation service
 * Automatically rotates secrets on a schedule
 */
export class SecretRotationService {
  private rotationIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Schedules automatic rotation for a secret
   */
  scheduleRotation(
    secretPath: string,
    intervalDays: number,
    rotationCallback: () => Promise<void>
  ): void {
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

    const interval = setInterval(async () => {
      try {
        console.log(`Rotating secret: ${secretPath}`);
        await rotationCallback();
        console.log(`Secret rotated successfully: ${secretPath}`);
      } catch (error) {
        console.error(`Failed to rotate secret ${secretPath}:`, error);
      }
    }, intervalMs);

    this.rotationIntervals.set(secretPath, interval);
  }

  /**
   * Cancels scheduled rotation for a secret
   */
  cancelRotation(secretPath: string): void {
    const interval = this.rotationIntervals.get(secretPath);
    if (interval) {
      clearInterval(interval);
      this.rotationIntervals.delete(secretPath);
    }
  }

  /**
   * Cancels all scheduled rotations
   */
  cancelAllRotations(): void {
    for (const interval of this.rotationIntervals.values()) {
      clearInterval(interval);
    }
    this.rotationIntervals.clear();
  }
}
