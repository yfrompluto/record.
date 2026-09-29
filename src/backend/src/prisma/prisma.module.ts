// =====================================================================
//		This module provides a PrismaClient instance built with the
//		DATABASE_URL constructed from Vault-fetched credentials.
//		Depends on VaultModule being resolved first.
// =====================================================================
import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { VaultModule } from '../vault/vault.module';
import { VaultService } from '../vault/vault.service';

@Module({
imports: [VaultModule],
providers: [
	{
	provide: PrismaClient,
	useFactory: async (vaultService: VaultService): Promise<PrismaClient> => {
		const { postgresUser, postgresPassword, postgresDb } = vaultService.getSecrets();

		const encodedUser = encodeURIComponent(postgresUser);
		const encodedPassword = encodeURIComponent(postgresPassword);

		const url = `postgresql://${encodedUser}:${encodedPassword}@postgres:5432/${postgresDb}?schema=public`;

		const prisma = new PrismaClient({
		datasources: { db: { url } },
		});

		try {
		await prisma.$connect();
		console.log('[~] Prisma connected to Postgres');
		} catch (error) {
		console.error('[!] Prisma failed to connect', error);
		throw error;
		}

		return prisma;
	},
	inject: [VaultService],
	},
],
exports: [PrismaClient],
})
export class PrismaModule {}