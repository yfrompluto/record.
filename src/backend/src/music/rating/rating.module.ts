// =====================================================================
//		Import rating main features.
//		MusicModule is imported to reuse its MusicService for lazy import
// 	(only when needed) tnaks to ensureImportedAlbum.
// ====================================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MusicModule } from '../music.module';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';

@Module({
	imports: [PrismaModule, MusicModule],
	controllers: [RatingController],
	providers: [RatingService],
})
export class RatingModule {}