// ====================================================================
//    Control the routes for the collection system.
//    All routes require to be authenticated.
// ====================================================================

import { Controller, Post, Patch, Delete, Get, Param, Query, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { CollectionService } from './collection.service';

@UseGuards(AuthGuard)
@Controller()
export class CollectionController {
	constructor(private readonly collectionService: CollectionService) {}

	@Post('albums/:mbid/collection')
	add(@Req() req, @Param('mbid', ParseUUIDPipe) mbid: string) {
		return this.collectionService.add(Number(req.user.sub), mbid);
	}

	@Delete('albums/:mbid/collection')
	remove(@Req() req, @Param('mbid', ParseUUIDPipe) mbid: string) {
		return this.collectionService.remove(Number(req.user.sub), mbid);
	}

	@Get('albums/:mbid/collection')
	isInCollection(@Req() req, @Param('mbid', ParseUUIDPipe) mbid: string) {
		return this.collectionService.isInCollection(Number(req.user.sub), mbid);
	}

	@Patch('albums/:mbid/collection/favorite')
	toggleFavorite(@Req() req, @Param('mbid', ParseUUIDPipe) mbid: string) {
		return this.collectionService.toggleFavorite(Number(req.user.sub), mbid);
	}

	@Get('users/me/collection')
	list(
		@Req() req,
		@Query('page') page?: string,
		@Query('pageSize') pageSize?: string,
		@Query('q') search?: string,
	) {
		return this.collectionService.list(Number(req.user.sub), {
			page: page ? Number(page) : undefined,
			pageSize: pageSize ? Number(pageSize) : undefined,
			search,
		});
	}

	@Get('users/:username/favorites')
	listFavorites(@Param('username') username: string) {
		return this.collectionService.listFavorites(username);
	}
}