import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaClient } from '@prisma/client';
import { CacheService } from '../cache/cache.service';

@Controller('health')
export class HealthController {
	constructor(
		private health: HealthCheckService,
		private prisma: PrismaClient,
		private cacheService: CacheService,
		private memory: MemoryHealthIndicator,
		private disk: DiskHealthIndicator,
	) {}

	@Get()
	@HealthCheck()
	check() {
		return this.health.check([
			() => this.checkBackend(),
			() => this.checkPostgres(),
			 () => this.checkRedis(),
			() => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300 MB max
			() => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
			() =>
			this.disk.checkStorage('disk', {
				path: '/',
				thresholdPercent: 0.9, // alerte si disque > 90% plein
			}),
		]);
	}

	private checkBackend(): HealthIndicatorResult {
		return { backend: { status: 'up' } };
	}

	private async checkPostgres(): Promise<HealthIndicatorResult> {
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			return { postgres: { status: 'up' } };
		} catch (error) {
			console.error('Postgres health check failed:', error);
			return { postgres: { status: 'down' } };
		}
	}

	private async checkRedis(): Promise<HealthIndicatorResult> {
		try {
			const response = await this.cacheService.ping();
			if (response !== 'PONG') {
				throw new Error(`Unexpected Redis ping response: ${response}`);
			}
			return { redis: { status: 'up' } };
		} catch (error) {
			console.error('Redis health check failed:', error);
			return { redis: { status: 'down' } };
		}
	}
}
