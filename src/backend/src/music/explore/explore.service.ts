import { Injectable } from "@nestjs/common";
import { PrismaClient } from '@prisma/client';


@Injectable()
export class ExploreService{
	constructor(
		private readonly prisma: PrismaClient,
	) {}

async getTrending() {
	const ratings = await this.prisma.albumRating.findMany({
		orderBy: {
			createdAt: 'desc',
		},
		take: 20,
		include: {
			album: {
				include: {
					artists: {
						include: {
							artist: true,
						},
					},
				},
			},
		},
	});

	const seen = new Set<number>();

	return ratings
		.filter((rating) => {
			if (seen.has(rating.album.id)) {
				return false;
			}

			seen.add(rating.album.id);
			return true;
		})
		.map((rating) => rating.album);
}

async getTopRated() {
	const ratings = await this.prisma.albumRating.findMany({
		include: {
			album: {
				include: {
					artists: {
						include: {
							artist: true,
						},
					},
				},
			},
		},
	});

	const grouped = new Map<
		number,
		{
			album: any;
			totalScore: number;
			count: number;
		}
	>();

	for (const rating of ratings) {
		const existing = grouped.get(rating.albumId);

		if (existing) {
			existing.totalScore += rating.score;
			existing.count += 1;
		} else {
			grouped.set(rating.albumId, {
				album: rating.album,
				totalScore: rating.score,
				count: 1,
			});
		}
	}

	return Array.from(grouped.values())
		.sort(
			(a, b) =>
				b.totalScore / b.count -
				a.totalScore / a.count,
		)
		.slice(0, 20)
		.map((item) => item.album);
}

async getRandomAlbum() {
	const count = await this.prisma.album.count();

	if (count === 0) {
		return null;
	}

	const skip = Math.floor(Math.random() * count);

	return this.prisma.album.findFirst({
		skip,
		include: {
			artists: {
				include: {
					artist: true,
				},
			},
		},
	});
}

async getFriendsActivity(userId: number) {
	const friendships = await this.prisma.friendship.findMany({
		where: {
			status: 'ACCEPTED',
			OR: [
				{requesterId: userId },
				{addresseeId: userId },
			],
		},
	});

	const friendIds = friendships.map((friendship) => 
		friendship.requesterId === userId
			? friendship.addresseeId
			: friendship.requesterId,	
	);

	if (friendIds.length === 0) {
		return [];
	}

	return this.prisma.albumRating.findMany({
		where: {
			userId: {
				in: friendIds,
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
		take: 20,
		include: {
			user: {
				select: {
					username: true,
					displayName: true,
					avatarFilename: true,
				},
			},
			album: {
				include: {
					artists: {
						include: {
							artist: true,
						},
					},
				},
			},
		},
	});
}
}
