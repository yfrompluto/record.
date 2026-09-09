import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { VaultService } from '../vault/vault.service';

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{

	constructor(
		private readonly vaultService: VaultService,
	) {
		super();
	}


	async onModuleInit() {

		const secrets = this.vaultService.getSecrets();

		process.env.DATABASE_URL =
			`postgresql://${secrets.postgresUser}:${secrets.postgresPassword}@postgres:5432/transcendence`;


		await this.$connect();

		console.log('[~] Prisma service initialized');
	}


	async onModuleDestroy() {
		await this.$disconnect();
		console.log('[~] Prisma service destroyed');
	}
}