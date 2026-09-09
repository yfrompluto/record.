import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { VaultModule } from '../vault/vault.module';

@Module({
	imports: [VaultModule],
	providers: [CacheService],
	exports: [CacheService],
})
export class CacheModule {}