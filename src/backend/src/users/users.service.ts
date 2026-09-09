// =======================================================================
//		This service manages user related operations - Auth, profile updates.
//		It retrieve existsing users or create new ones, and is the central
// 	access point for user data used by other modules. 
//		It allows users to update their profile information.
// =======================================================================

import { Injectable, 
	ConflictException,
	NotFoundException } from '@nestjs/common';
import { PrismaClient, User } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { AVATAR_DIR } from './avatar.constants';

@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaClient) {}

	async findOne(username: string): Promise<User | null> {
		return this.prisma.user.findUnique({ where: { username } });
	}

	async findByEmail(email: string): Promise<User | null> {
		return this.prisma.user.findUnique({ where: { email } });
	}

	async findById(id: number): Promise<User | null> {
		return this.prisma.user.findUnique({ where: { id } });
	}

	async create(username: string, email: string, passwordHash: string): Promise<User> {
		try {
			return await this.prisma.user.create({
				data: { username, email, password: passwordHash },
			});
		} catch (err: any) {
			if (err.code === 'P2002') {
				throw new ConflictException(`${err.meta?.target?.join(', ')} already in use`);
			}
			throw err;
		}
	}

/**
 * 	Methods to update the user's profile
 */
	async updateProfile(
		userId: number,
		data: {displayName?: string; bio?: string },
	): Promise<User> {
		try {
			return await this.prisma.user.update({
				where: { id: userId },
				data,
			});
		} catch (err: any) {
			if (err.code === 'P2025') {
				throw new NotFoundException('User not found');
			}
			throw err;
		}
	}

	/**
	 * 	Avatar upload handling:
	 * 		- delete the previous avatar file if one already exists and is 
	 * 		  different from the new one (can be a different extension too)
	 * 		- ignore the "file not found", nothing to clean up
	 * 		- other errors are logged server-side but don't interfere w/ profile update
	 * 		- add new filename to the db through Prisma
	 */
	async updateAvatar(userId: number, newFilename: string): Promise<User> {
		const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
		if (currentUser?.avatarFilename && currentUser.avatarFilename !== newFilename) {
			const oldPath = join(AVATAR_DIR, currentUser.avatarFilename);
			try {
				await unlink(oldPath);
			} catch (err: any) {
				if (err.code !== 'ENOENT') {
					console.error(`[!] Failed to delete previous avatar ${oldPath}:`, err);
				}
			}
		}

		return this.prisma.user.update({
			where: { id: userId },
			data: { avatarFilename: newFilename },
		});
	}
	
	/* Search users */
	async search(query: string, currentUserId: number) {
		const [existingRelations, blocks] = await Promise.all([
		this.prisma.friendship.findMany({
			where: {
				OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }],
			},
			select: { requesterId: true, addresseeId: true },
		}),
		this.prisma.block.findMany({
			where: {
				OR: [{blockerId: currentUserId }, { blockedId: currentUserId }],
			},
			select: {blockerId: true, blockedId: true},
		}),
	]);
		const excludedUserIds = new Set([
			...existingRelations.flatMap((r) => [r.requesterId, r.addresseeId]),
			...blocks.flatMap((b) => [b.blockerId, b.blockedId]),
		]);
		excludedUserIds.delete(currentUserId);

		return this.prisma.user.findMany({
			where: {
				id: { not: currentUserId, notIn: Array.from(excludedUserIds) },
				OR: [
					{ username: { contains: query, mode: 'insensitive' } },
					{ displayName: { contains: query, mode: 'insensitive' } },
				],
			},
			select: { id: true, username: true, displayName: true, avatarFilename: true },
			take: 20,
		});
	}

	/**
	 * 	Public album ratings recap
	 */
	async getRatings(username: string, viewerId?: number) {
		const user = await this.prisma.user.findUnique({ where: { username } });
		if (!user)
			throw new NotFoundException('User not found');

		const ratings = await this.prisma.albumRating.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: 'desc' },
			include: {
				_count: { select: { likes: true } },
				likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
				album: {
					include: {
						artists: { include: { artist: true } },
						tracks: { orderBy: { position: 'asc' } },
					},
				},
			},
		});

		const allTrackIds = ratings.flatMap((r) => r.album.tracks.map((t) => t.id));
		const trackRatings = await this.prisma.trackRating.findMany({
			where: { userId: user.id, trackId: { in: allTrackIds } },
		});
		const scoreByTrackId = new Map(trackRatings.map((tr) => [tr.trackId, tr.score]));

		return ratings.map((r) => ({
			id: r.id,
			score: r.score,
			review: r.review,
			isAutoRate: r.isAutoRate,
			likesCount: r._count.likes,
			likedByMe: viewerId ? r.likes.length > 0 : false,
			createdAt: r.createdAt,
			album: {
				mbid: r.album.mbid,
				title: r.album.title,
				coverArtUrl: r.album.coverArtUrl,
				releaseYear: r.album.releaseYear,
				artists: r.album.artists.map((a) => ({ mbid: a.artist.mbid, name: a.artist.name })),
				tracks: r.album.tracks.map((t) => ({
					id: t.id,
					title: t.title,
					position: t.position,
					score: scoreByTrackId.get(t.id) ?? undefined,
				})),
			},
		}));
	}

	async getPublicFriends(username: string) {
		const user = await this.prisma.user.findUnique({ where: { username } });
		if (!user)
			throw new NotFoundException('User not found');

		const friendships = await this.prisma.friendship.findMany({
			where: {
				status: 'ACCEPTED',
				OR: [{ requesterId: user.id }, { addresseeId: user.id }],
			},
			include: {
				requester: { select: { id: true, username: true, displayName: true, avatarFilename: true }},
				addressee: { select: { id: true, username: true, displayName: true, avatarFilename: true }},
			},
		});

		return friendships.map((f) => (f.requesterId === user.id ? f.addressee : f.requester));
	}

	/**
	 * 	User activity analysis - stats
	 */
	async getStats(userId: number) {
		const [totalRatings, totalPlaylists, totalCollected, avgAgg] = await Promise.all([
			this.prisma.albumRating.count({ where: { userId } }),
			this.prisma.playlist.count({ where: { userId } }),
			this.prisma.albumCollection.count({ where: { userId } }),
			this.prisma.albumRating.aggregate({ where: { userId }, _avg: { score: true } }),
		]);

		// favourite artist = most frequent artist across albums the user rated /collected
		const [ratedAlbums, collectedAlbums] = await Promise.all([
			this.prisma.albumRating.findMany({ where: { userId }, select: { albumId: true } }),
			this.prisma.albumCollection.findMany({ where: { userId }, select: { albumId: true } }),
		]);
		const albumIds = [...new Set([
			...ratedAlbums.map((r) => r.albumId),
			...collectedAlbums.map((c) => c.albumId),
		])];

		let favoriteArtist: string | null = null;
		if (albumIds.length > 0) {
			const grouped = await this.prisma.albumArtist.groupBy({
				by: ['artistId'],
				where: { albumId: { in: albumIds } },
				_count: { albumId: true },
				orderBy: { _count: { albumId: 'desc' } },
				take: 1,
			});
			if (grouped.length > 0) {
				const artist = await this.prisma.artist.findUnique({ where: { id: grouped[0].artistId } });
				favoriteArtist = artist?.name ?? null;
			}
		}

		return {
			totalRatings,
			totalPlaylists,
			totalCollected,
			averageRating: avgAgg._avg.score ? Math.round(avgAgg._avg.score * 10) / 10 : null,
			favoriteArtist,
		};
	}
}