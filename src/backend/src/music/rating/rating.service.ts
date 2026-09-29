// ======================================================================
//		Rate or update the rating of an album/a single track.
//		A user can either rate a whole album , or rate each track.
//			- if the user rate by track, the album rate is the average score
//			- rating the album takes priority over track-rating
// ======================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MusicService } from '../music.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../../notifications/events/notification-events';


@Injectable()
export class RatingService {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly musicService: MusicService,
		private readonly eventEmitter: EventEmitter2,
	) {}

	/**
	 * 	GET the cu=rrent user's album rating, null means "not rated yet"
	 */
	async getAlbumRating(userId: number, albumMbid: string) {
		const album = await this.prisma.album.findUnique({ where: { mbid: albumMbid } });
		if (!album)
			return null;

		return this.prisma.albumRating.findUnique({
			where: { userId_albumId: { userId, albumId: album.id } },
		});
	}

	/**
	 * 	GET all the current user's track ratings for a given album
	 * 	this way, a map is returned rather than having multiple calls on frontend
	 */
	async getTrackRatings(userId: number, albumMbid: string) {
		const album = await this.prisma.album.findUnique({
			where: { mbid: albumMbid },
			include: { tracks: true },
		});
		if (!album)
			return {};

		const ratings = await this.prisma.trackRating.findMany({
			where: { userId, track: { albumId: album.id } },
		});

		const trackIdToMbid = new Map(album.tracks.map((t) => [t.id, t.mbid]));

		const result: Record<string, number> = {};
		for (const rating of ratings) {
			const mbid = trackIdToMbid.get(rating.trackId);
			if (mbid) result[mbid] = rating.score;
		}
		return result;
	}
	/**
	 * 	isAutoRate is false the moment the entire album receives a rating 
	 * 	-> album rate cant be overwritten by the track average rates
	 * 
	 * 	After saving, notifies any friend of the user who has already
	 * 	rated this same album — see notifyFriendsWhoAlreadyRated().
	 */
	async rateAlbum(userId: number, albumMbid: string, score: number, review?: string) {
		const album = await this.musicService.ensureAlbumImported(albumMbid);

		const rating = await this.prisma.albumRating.upsert({
			where: { userId_albumId: { userId, albumId: album.id } },
			update: { score, review, isAutoRate: false },
			create: { userId, albumId: album.id, score, review, isAutoRate: false },
		});

		await this.notifyFriendsWhoAlreadyRated(userId, album.id, albumMbid, rating.id);

		return rating;
	}

	async removeAlbumRating(userId: number, albumMbid: string) {
		const album = await this.prisma.album.findUnique({ where: { mbid: albumMbid } });
		if (!album)
			throw new NotFoundException('Album not found');

		const result = await this.prisma.albumRating.deleteMany({ where: { userId, albumId: album.id } });
		if (result.count === 0) {
			throw new NotFoundException('Rating not found for this user');
		}

		await this.prisma.albumRating.deleteMany({ where: { userId, albumId: album.id } });

		/**
		 * 	once the whole album rating is gone, fallback to the track average note
		 * 		-> album cant be unrated
		 */
		await this.recomputeAlbumRatingFromTracks(userId, album.id);
	}

	async rateTrack(userId: number, albumMbid: string, trackMbid: string, score: number) {
		const album = await this.musicService.ensureAlbumImported(albumMbid);

		const track = await this.prisma.track.findUnique({ where: { mbid: trackMbid } });
		if (!track)
			throw new NotFoundException('Track not found');

		const rating = await this.prisma.trackRating.upsert({
			where: { userId_trackId: { userId, trackId: track.id } },
			update: { score },
			create: { userId, trackId: track.id, score },
		});

		await this.recomputeAlbumRatingFromTracks(userId, album.id);

		return rating;
	}


	async removeTrackRating(userId: number, trackMbid: string) {
		const track = await this.prisma.track.findUnique({ where: { mbid: trackMbid } });
		if (!track)
			throw new NotFoundException('Track not found');

		await this.prisma.trackRating.deleteMany({ where: { userId, trackId: track.id } });

		await this.recomputeAlbumRatingFromTracks(userId, track.albumId);
	}

	/**
	 * 	Rate the album based on the current track rating
	 * 		- avg rate includes partial rates
	 * 		- only change AlbumRating if the album wasn't rated track by track
	 * 		- again, whole album rating takes priority
	 * 		- final rate is still a round or .5 number
	 * 
	 * 		Rate calculation;
	 * 			_count.score = nb of lines where a score is mentionned 
	 * 			_avg.score = average score (for album avg rate)
	 * 			e.g; 12 songs, 3 rated, average note from these 3
	 * 		
	 */
	private async recomputeAlbumRatingFromTracks(userId: number, albumId: number) {
		const existing = await this.prisma.albumRating.findUnique({
			where: { userId_albumId: { userId, albumId } },
		});

		if (existing && !existing.isAutoRate) {
			return;
		}

		const { _avg, _count } = await this.prisma.trackRating.aggregate({
			where: { userId, track: { albumId } },
			_avg: { score: true },
			_count: { score: true },
		});

		if (_count.score === 0) {
			if (existing) {
				await this.prisma.albumRating.delete({ where: { userId_albumId: { userId, albumId } } });
			}
			return;
		}

		const avgScore = Math.round(_avg.score! * 2) / 2;

		await this.prisma.albumRating.upsert({
			where: { userId_albumId: { userId, albumId } },
			update: { score: avgScore, isAutoRate: true },
			create: { userId, albumId, score: avgScore, isAutoRate: true },
		});
	}

	async likeRating(userId: number, albumRatingId: number) {
		const rating = await this.prisma.albumRating.findUnique({
			where: { id: albumRatingId },
			include: { album: { select: { mbid: true, title: true } } },
		});
		if (!rating)
			throw new NotFoundException('Rating not found');

		try {
			await this.prisma.reviewLike.create({ data: { userId, albumRatingId } });

			if (userId !== rating.userId) {
				this.eventEmitter.emit(NOTIFICATION_EVENTS.RATING_LIKED, {
					albumRatingId: rating.id,
					actorId: userId,
					recipientId: rating.userId,
					albumMbid: rating.album.mbid,
					albumTitle: rating.album.title,
				});
			}
		} catch (err: any) {
			if (err.code !== 'P2002')
				throw err;
		}

		return this.prisma.albumRating.findUnique({
			where: { id: albumRatingId },
			select: { _count: { select: { likes: true } } },
		});
	}

	async unlikeRating(userId: number, albumRatingId: number) {
		await this.prisma.reviewLike.deleteMany({ where: { userId, albumRatingId } });

		return this.prisma.albumRating.findUnique({
			where: { id: albumRatingId },
			select: { _count: { select: { likes: true } } },
		});
	}

	// FOR EXPLORE AND HOME PAGE
		/* Trends of the week (albums with the most new ratings over 7 days) */

	async getTrending(limit = 10) {
		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		const trending = await this.prisma.albumRating.groupBy({
			by: ['albumId'],
			where: { createdAt: { gte: sevenDaysAgo } },
			_count: { albumId: true },
			orderBy: { _count: { albumId: 'desc' } },
			take: limit,
		});

		const albumIds = trending.map((t) => t.albumId);
		const albums = await this.prisma.album.findMany({
			where: { id: { in: albumIds } },
			include: { artists: { include: { artist: true } } },
		});

		return albumIds.map((id) => albums.find((a) => a.id === id)).filter(Boolean);
	}

		/* Highest-rated */
	
	async getTopRated(limit = 10, minRatings = 3) {
		const grouped = await this.prisma.albumRating.groupBy({
			by: ['albumId'],
			_avg: { score: true},
			_count: { albumId: true},
			having: { albumId: { _count: { gte: minRatings } } },
			orderBy: { _avg: { score: 'desc' } },
			take: limit,
		});

		const albumIds = grouped.map((g) => g.albumId);
		const albums = await this.prisma.album.findMany({
			where: { id: { in: albumIds } },
			include: { artists: { include: { artist: true } } },
		});

		return albumIds.map((id) => albums.find((a) => a.id === id)).filter(Boolean);
	}

		/* Random album */

	async getRandomAlbum() {
		const count = await this.prisma.album.count();
		if (count === 0) return null;
		const skip = Math.floor(Math.random() * count);
		return this.prisma.album.findFirst({
			skip,
			include: { artists: { include: { artist: true } } },
		});
	}

	async getFriendsActivity(friendIds: number[], limit = 20) {
		return this.prisma.albumRating.findMany({
			where: { userId: { in: friendIds } },
			orderBy: { createdAt: 'desc' },
			take: limit,
			include:{
				user: { select: { id: true, username: true, displayName: true, avatarFilename: true } },
				album: { include: { artists: { include: { artist: true } } } },
			},
		});
	}


	/**
	 * 	Finds every friend of `actorId` who has already rated this album,
	 * 	and emits one FRIEND_ALBUM_RATED event per match.
	 */
	private async notifyFriendsWhoAlreadyRated(
		actorId: number,
		albumId: number,
		albumMbid: string,
		albumRatingId: number,
	) {
		const friendIds = await this.getFriendUserIds(actorId);
		if (friendIds.length === 0) return;

		const alreadyRatedBy = await this.prisma.albumRating.findMany({
			where: { albumId, userId: { in: friendIds } },
			select: { userId: true },
		});

		for (const { userId: recipientId } of alreadyRatedBy) {
			this.eventEmitter.emit(NOTIFICATION_EVENTS.FRIEND_ALBUM_RATED, {
				albumRatingId,
				albumMbid,
				actorId,
				recipientId,
			});
		}
	}

	private async getFriendUserIds(userId: number): Promise<number[]> {
		const friendships = await this.prisma.friendship.findMany({
			where: {
				status: 'ACCEPTED',
				OR: [{ requesterId: userId }, { addresseeId: userId }],
			},
			select: { requesterId: true, addresseeId: true },
		});
		return friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
	}

	/**
	 * Deletes a rec entirely: the album rating (score + review), every
	 * 	individual track rating on that album for this user, and any likes
	 * 	on the review.
	 */
	async deleteRec(userId: number, albumMbid: string) {
		const album = await this.prisma.album.findUnique({
			where: { mbid: albumMbid },
			include: { tracks: { select: { id: true } } },
		});
		if (!album)
			throw new NotFoundException('Album not found');

		const trackIds = album.tracks.map((t) => t.id);

		// Capture who liked this rec BEFORE deleting the likes/rating,
		// so we can notify them once the deletion is done.
		const albumRating = await this.prisma.albumRating.findUnique({
			where: { userId_albumId: { userId, albumId: album.id } },
			include: { likes: { select: { userId: true } } },
		});

		const likedByUserIds = albumRating?.likes.map((l) => l.userId) ?? [];

		await this.prisma.$transaction([
			this.prisma.reviewLike.deleteMany({
				where: { albumRating: { userId, albumId: album.id } },
			}),
			this.prisma.trackRating.deleteMany({
				where: { userId, trackId: { in: trackIds } },
			}),
			this.prisma.albumRating.deleteMany({
				where: { userId, albumId: album.id },
			}),
			]);

			for (const recipientId of likedByUserIds) {
			this.eventEmitter.emit(NOTIFICATION_EVENTS.RATING_DELETED, {
				actorId: userId,
				recipientId,
				albumMbid: album.mbid,
				albumTitle: album.title,
			});
		}
	}
}