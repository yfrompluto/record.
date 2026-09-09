// =============================================================
//    Allowing users to add an album to their collection.
//    This serves as an archive for users to display their
//    favourite albums (without needing to rate them), and then
//    share this with friends.
// =============================================================

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { MusicService } from '../music.service';

const FAV_ALBUMS = 3;

interface ListCollectionOpts {
	page?: number;
	pageSize?: number;
	search?: string;
}

/**
 *    - add; the album is always lazily imported first so the FK works even
 *       if the user never searched it before
 *       - P2002 = user can only have the same album once in their collection
 *    - remove; remove an album from the collection
 *    - list; paginated collection, ordered by add date, optional search
 *       (matches on album title, artist name, or track title)
 *    - isInCollection; frontend helper for "add to collection"
 *    - toggleFavorite; marks/unmarks an album as favorite, max 3 per user
 */
@Injectable()
	export class CollectionService {
		constructor(
			private readonly prisma: PrismaClient,
			private readonly musicService: MusicService,
		) {}

		async add(userId: number, albumMbid: string) {
			const album = await this.musicService.ensureAlbumImported(albumMbid);

			try {
				return await this.prisma.albumCollection.create({
				data: {
					userId,
					albumId: album.id,
				},
				});
			} catch (err) {
				if (err instanceof Error && 'code' in err && err.code === 'P2002') {
					return this.prisma.albumCollection.findUnique({
						where: {
							userId_albumId: {
							userId,
							albumId: album.id,
							},
						},
					});
				}
				throw err;
			}
		}

	async remove(userId: number, albumMbid: string) {
			const album = await this.prisma.album.findUnique({
				where: { mbid: albumMbid },
			});
			if (!album)
				return;

			await this.prisma.albumCollection.deleteMany({
				where: {
				userId,
				albumId: album.id,
				},
			});
	}

		async list(userId: number, options: ListCollectionOpts = {}) {
			const page = options.page && options.page > 0 ? options.page : 1;
			const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 8;
			const search = options.search?.trim();

			const where: Prisma.AlbumCollectionWhereInput = {
				userId,
				...(search
				? {
						album: {
						OR: [
							{ title: { contains: search, mode: 'insensitive' } },
							{ artists: { some: { artist: { name: { contains: search, mode: 'insensitive' } } } } },
							{ tracks: { some: { title: { contains: search, mode: 'insensitive' } } } },
						],
						},
					}
				: {}),
			};

			const [items, total] = await this.prisma.$transaction([
				this.prisma.albumCollection.findMany({
				where,
				include: {
					album: {
						include: {
						artists: { include: { artist: true } },
						},
					},
				},
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * pageSize,
				take: pageSize,
				}),
				this.prisma.albumCollection.count({ where }),
			]);

			return {
				items,
				total,
				page,
				pageSize,
				totalPages: Math.max(1, Math.ceil(total / pageSize)),
			};
		}

		async isInCollection(userId: number, albumMbid: string): Promise<boolean> {
			const album = await this.prisma.album.findUnique({
				where: { mbid: albumMbid },
			});
			if (!album)
				return false;

			const entry = await this.prisma.albumCollection.findUnique({
				where: {
				userId_albumId: {
					userId,
					albumId: album.id,
				},
				},
			});

			return entry !== null;
		}

		async toggleFavorite(userId: number, albumMbid: string) {
			const album = await this.prisma.album.findUnique({
				where: { mbid: albumMbid },
			});
			if (!album)
				throw new NotFoundException('Album not found');

			const entry = await this.prisma.albumCollection.findUnique({
				where: {
				userId_albumId: {
					userId,
					albumId: album.id,
				},
				},
			});
			if (!entry) throw new NotFoundException('Album is not in your collection');

			if (entry.isFavorite) {
				const updated = await this.prisma.albumCollection.update({
					where: { id: entry.id },
					data: { isFavorite: false },
				});
				return { success: true as const, entry: updated };
			}

			const favoriteCount = await this.prisma.albumCollection.count({
				where: { userId, isFavorite: true },
			});
			if (favoriteCount >= FAV_ALBUMS) {
				return { success: false as const, reason: 'MAX_FAVORITES' as const };
			}

			const updated = await this.prisma.albumCollection.update({
				where: { id: entry.id },
				data: { isFavorite: true },
			});
			return { success: true as const, entry: updated };
		}

		async listFavorites(username: string) {
			const user = await this.prisma.user.findUnique({
				where: { username },
				select: { id: true },
			});
			if (!user)
				throw new NotFoundException('User not found');

			const entries = await this.prisma.albumCollection.findMany({
				where: { userId: user.id, isFavorite: true },
				select: { album: true },
				orderBy: { createdAt: 'desc' },
			});
			return entries.map((entry) => entry.album);
		}
}