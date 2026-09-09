// =====================================================================
//		This service securely fetches the backend credentials from Vault.
//		It authenticates using AppRole, loads required credentials, and
//		exposes them to the application after initialisation.
// =====================================================================

import { Injectable, OnModuleInit } from '@nestjs/common';
import { BackendSecrets, VaultApproleResponse, VaultSecretResponse } from './vault.types';
import { readFile } from 'fs/promises';
import axios from 'axios';
import * as https from 'https';

/**
 * 	- avoids deadlock since creds are not loaded during build
 */
@Injectable()
export class VaultService implements OnModuleInit {
	private secrets: BackendSecrets | undefined;

	private readonly roleidPath = '/vault/backend/.role-id';
	private readonly secretidPath = '/vault/backend/.secret-id';
	private readonly vaultAddr = 'https://vault:8200';
	private readonly vaultCaCertPath = '/vault/backend/ca.crt';

	
	
	async loadSecrets(): Promise<void> {
		const { roleId, secretId } = await this.readRoleAndSecretIds();
		const clientToken = await this.authentificationWithAppRole(roleId, secretId);
		this.secrets = await this.fetchBackendSecrets(clientToken);
	}

	private async readRoleAndSecretIds(): Promise<{ roleId: string; secretId: string }> {
		const roleId = await readFile(this.roleidPath, 'utf-8');
		const secretId = await readFile(this.secretidPath, 'utf-8');
		return { roleId: roleId.trim(), secretId: secretId.trim() };
	}

	private async getHttpsAgent(): Promise<https.Agent> {
		const ca = await readFile(this.vaultCaCertPath, 'utf-8');
		return new https.Agent({ ca });
	}

	private async authentificationWithAppRole(roleId: string, secretId: string): Promise<string> {
		const httpsAgent = await this.getHttpsAgent();
		const response = await axios.post<VaultApproleResponse>(
			`${this.vaultAddr}/v1/auth/approle/login`,
			{ role_id: roleId, secret_id: secretId },
			{ httpsAgent, timeout: 5000 },
		);
		return response.data.auth.client_token;
	}

	private async fetchBackendSecrets(clientToken: string): Promise<BackendSecrets> {
		const httpsAgent = await this.getHttpsAgent();
		const response = await axios.get<VaultSecretResponse>(
			`${this.vaultAddr}/v1/secret/data/backend`,
			{ headers: { 'X-Vault-Token': clientToken }, httpsAgent, timeout: 5000 },
		);
		const { postgres_user, postgres_password, postgres_db, jwt_secret, redis_password } = response.data.data.data;
		return { postgresUser: postgres_user, postgresPassword: postgres_password, postgresDb: postgres_db, jwtSecret: jwt_secret, redisPassword: redis_password };
	}

	public getSecrets(): BackendSecrets {
		if (!this.secrets) {
			throw new Error('[!] Error: Vault secrets have not been loaded yet');
		}
		return this.secrets;
	}

	async onModuleInit()
	{
		try {
			await this.loadSecrets();
			console.log('[~] Vault secrets loaded');
		}
		catch (error) {
			console.error('[!] Failed to load Vault secrets', error);
			throw error;
		}
	}
}
