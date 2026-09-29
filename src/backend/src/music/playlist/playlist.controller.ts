// ====================================================================
//		Control the routes for the rating system.
//		All routes require to be authenticated.
// ===================================================================

import {
	Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, Req, 
	ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { PlaylistService } from './playlist.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';

@UseGuards(AuthGuard)
@Controller()
export class PlaylistController {
	constructor(private readonly playlistService: PlaylistService) {}

	@Post('playlists')
	create(@Req() req, @Body() dto: CreatePlaylistDto) {
		return this.playlistService.create(Number(req.user.sub), dto);
	}

	@Get('playlists/me')
	listMine(@Req() req) {
		return this.playlistService.listMine(Number(req.user.sub));
	}

	@Get('users/:userId/playlists')
	listForUser(@Req() req, @Param('userId', ParseIntPipe) userId: number) {
		return this.playlistService.listForUser(Number(req.user.sub), userId);
	}

	@Get('playlists/:id')
	getById(@Req() req, @Param('id', ParseIntPipe) id: number) {
		return this.playlistService.getById(Number(req.user.sub), id);
	}

	@Patch('playlists/:id')
	update(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlaylistDto) {
		return this.playlistService.update(Number(req.user.sub), id, dto);
	}

	@Delete('playlists/:id')
	remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
		return this.playlistService.remove(Number(req.user.sub), id);
	}

	@Post('playlists/:id/albums/:mbid')
	addAlbum(
		@Req() req,
		@Param('id', ParseIntPipe) id: number,
		@Param('mbid') mbid: string,
	) {
		return this.playlistService.addAlbum(Number(req.user.sub), id, mbid);
	}

	@Delete('playlists/:id/albums/:mbid')
	removeAlbum(
		@Req() req,
		@Param('id', ParseIntPipe) id: number,
		@Param('mbid') mbid: string,
	) {
		return this.playlistService.removeAlbum(Number(req.user.sub), id, mbid);
	}
}