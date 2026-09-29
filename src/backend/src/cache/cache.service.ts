// =====================================================================
//    Redis cache wrapper to include Music metadata and covers.
//    Connects to Redis using the password fetched from Vault via
//    VaultService, exposes simple get/set/del helpers with TTL support.
// =====================================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { VaultService } from "../vault/vault.service";

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
	private client: Redis | undefined;

	constructor(private readonly vaultService: VaultService) {}

	async onModuleInit(): Promise<void> {
			const { redisPassword } = this.vaultService.getSecrets();

			this.client = new Redis({
				host: "redis",
				port: 6379,
				password: redisPassword,
				lazyConnect: false,
			});

			this.client.on("error", (err) => {
				console.error("[!] Redis connection error", err);
			});

			console.log("[~] Redis cache client connected");
	}

	async onModuleDestroy(): Promise<void> {
			await this.client?.quit();
	}

	private getClient(): Redis {
		if (!this.client) {
			throw new Error("[!] Error: Redis client has not been initialized yet");
		}
		return this.client;
	}

	async ping(): Promise<string> {
		return this.getClient().ping();
	}

	async get(key: string): Promise<string | null> {
			return this.getClient().get(key);
	}

	async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
			if (ttlSeconds) {
				await this.getClient().set(key, value, "EX", ttlSeconds);
			} else {
				await this.getClient().set(key, value);
			}
	}

	async del(key: string): Promise<void> {
			await this.getClient().del(key);
	}
}