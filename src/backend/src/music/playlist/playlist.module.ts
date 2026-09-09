// =====================================================================
//		Import rating main features.
//		MusicModule is imported to reuse its MusicService for lazy import
// 	(only when needed) tnaks to ensureImportedAlbum.
// ====================================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MusicModule } from '../music.module';
import { PlaylistController } from './playlist.controller';
import { PlaylistService } from './playlist.service';

@Module({
	imports: [PrismaModule, MusicModule],
	controllers: [PlaylistController],
	providers: [PlaylistService],
})
export class PlaylistModule {}