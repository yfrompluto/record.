import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExploreModule } from './explore/explore.module';
import { MusicbrainzClientService } from './musicbrainz-client.service';
import { CoverArtService } from './cover-art.service';
import { MusicService } from './music.service';
import { MusicController } from './music.controller';

@Module({
	imports: [CacheModule, PrismaModule, ExploreModule],
	controllers: [MusicController],
	providers: [MusicbrainzClientService, CoverArtService, MusicService],
	exports: [MusicService],
})
export class MusicModule {}
