// ==================================================================
//    Routing for album/artist search and detail pages.
//    Read-only endpoints backed by MusicService. All routes require
//		authentication.
// ==================================================================

import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { MusicService } from './music.service';

@Controller('music')
@UseGuards(AuthGuard)
export class MusicController {
	constructor(private readonly musicService: MusicService) {}

	// GET /music/search?q=...
	@Get('search')
	async search(@Query('q') query: string) {
		if (!query || query.trim().length === 0) {
			throw new BadRequestException('Query parameter "q" is required');
		}
		return this.musicService.searchAlbums(query.trim());
	}

  	
	@Get('albums/:mbid')
	async getAlbum(@Param('mbid', new ParseUUIDPipe()) mbid: string) {
		return this.musicService.getAlbumDetail(mbid);
	}

}