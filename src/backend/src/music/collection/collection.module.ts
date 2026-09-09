// =====================================================================
//		Import collection main features.
//		MusicModule is imported to reuse its MusicService for lazy import
// 	(only when needed) tnaks to ensureImportedAlbum.
// ====================================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MusicModule } from '../music.module';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';

@Module({
	imports: [PrismaModule, MusicModule],
	controllers: [CollectionController],
	providers: [CollectionService],
})
export class CollectionModule {}