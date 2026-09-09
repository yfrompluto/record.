// =================================================================
//		Manage users' playlist feature.
//		Users can create, update or delete playlists that can either
//		be public (visible to anyone) or private (visible to the
//		owner only).
// =================================================================

import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma, PlaylistVisibility } from '@prisma/client';
import { MusicService } from '../music.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';

@Injectable()
export class PlaylistService {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly musicService: MusicService,
	) {}

	create(userId: number, dto: CreatePlaylistDto) {
		return this.prisma.playlist.create({
			data: {
				userId,
				title: dto.title,
				description: dto.description,
				visibility: dto.visibility,
			},
		});
	}

	// Lists all playlists created by me (authd user) in descending order
	listMine(userId: number) {
		return this.prisma.playlist.findMany({
			where: {
				userId
			},
			orderBy: {
				createdAt: 'desc'
			},
			include: {
				_count: {
					select: {
						albums: true
					}
				}
			},
		});
	}

	/**
	 * 	Lists another user's playlists — PUBLIC only, regardless of who's asking.
	 *			- targetUserId = user you want to see the playlists of
	 */
	listForUser(requestingUserId: number, targetUserId: number) {
		return this.prisma.playlist.findMany({
			where: {
				userId: targetUserId,
				visibility: PlaylistVisibility.PUBLIC,
			},
			orderBy: {
				createdAt: 'desc'
			},
			include: {
				_count: {
					select: {
						albums: true
					}
				}
			},
		});
	}

	// Get a playlist with all the albums it contains (if user can see it)
	async getById(requestingUserId: number, playlistId: number) {
		const playlist = await this.prisma.playlist.findUnique({
			where: {
				id: playlistId
			},
			include: {
				albums: {
					orderBy: {
						addedAt: 'asc'
					},
					include: {
						album: {
							include: {
								artists: {
									include: {
										artist: true
									}
								}
							}
						}
					},
				},
			},
		});

		if (!playlist)
			throw new NotFoundException('Uh oh, playlist not found');

		if (playlist.userId !== requestingUserId && playlist.visibility !== PlaylistVisibility.PUBLIC) {
			throw new ForbiddenException('This playlist is private');
		}

		return {
			...playlist,
			albums: playlist.albums.map((entry) => ({
				...entry,
				album: {
					...entry.album,
					artists: entry.album.artists.map((a) => ({
						mbid: a.artist.mbid,
						name: a.artist.name,
					})),
				},
			})),
		};
	}
	async update(userId: number, playlistId: number, dto: UpdatePlaylistDto) {
		await this.assertOwnership(userId, playlistId);

		return this.prisma.playlist.update({
			where: {
				id: playlistId
			},
			data: dto,
		});
	}

	async remove(userId: number, playlistId: number) {
		await this.assertOwnership(userId, playlistId);

		await this.prisma.$transaction([
			this.prisma.playlistAlbum.deleteMany({
				where: { playlistId },
			}),
			this.prisma.playlist.delete({
				where: { id: playlistId },
			}),
		]);
	}

	// Add an album to a playlist
	async addAlbum(userId: number, playlistId: number, albumMbid: string) {
		await this.assertOwnership(userId, playlistId);
		const album = await this.musicService.ensureAlbumImported(albumMbid);

		try {
			return await this.prisma.playlistAlbum.create({
					data: {
						playlistId,
						albumId: album.id
					},
			});
		} catch (err) {
			if (err instanceof Error && 'code' in err && err.code === 'P2002') {
				// already in the playlist
				return this.prisma.playlistAlbum.findUnique({
					where: {
						playlistId_albumId: {
							playlistId,
							albumId: album.id
						}
					},
				});
			}
			throw err;
		}
	}

	async removeAlbum(userId: number, playlistId: number, albumMbid: string) {
		await this.assertOwnership(userId, playlistId);

		const album = await this.prisma.album.findUnique({
			where: {
				mbid: albumMbid
			}
		});
		if (!album)
			return;

		await this.prisma.playlistAlbum.deleteMany({
			where: {
				playlistId,
				albumId: album.id
			}
		});
	}

	private async assertOwnership(userId: number, playlistId: number) {
		const playlist = await this.prisma.playlist.findUnique({
			where: {
				id: playlistId
			}
		});

		if (!playlist)
			throw new NotFoundException('Playlist not found.');
		if (playlist.userId !== userId) {
			throw new ForbiddenException('You are not the owner of this playlist.');
		}
	}
}