// =====================================================================
//    Handling album/artist metadata.
//			- read path (search, album detail..);  cache -> MusicBrainz API.
//			- write path (ensureAlbumImported); lazily upserts Artist/Album/
//				into the db
// =====================================================================

import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Album, PrismaClient } from '@prisma/client';
import axios from 'axios';
import { CacheService } from '../cache/cache.service';
import { MusicbrainzClientService } from './musicbrainz-client.service';
import { CoverArtService } from './cover-art.service';
import { AlbumDetailDto } from './dto/album-detail.types';
import { MusicBrainzReleaseGroup, MusicBrainzReleaseGroupSearchResult } from './dto/musicbrainz-response.types';

/**
 * 	- search details - 1 day
 * 	- album details - 7 days
 */
const SEARCH_TTL_SECONDS = 60 * 60 * 24;
const DETAIL_TTL_SECONDS = 60 * 60 * 24 * 7;

@Injectable()
export class MusicService {
	constructor(
		private readonly cache: CacheService,
		private readonly prisma: PrismaClient,
		private readonly musicbrainz: MusicbrainzClientService,
		private readonly coverArt: CoverArtService,
	) {}

	async searchAlbums(query: string): Promise<MusicBrainzReleaseGroupSearchResult> {
		const cacheKey = `mb:search:release-group:${query}`;
		const cached = await this.cache.get(cacheKey);
		if (cached) {
			return JSON.parse(cached);
		}

		let result: MusicBrainzReleaseGroupSearchResult;
		try {
			result = await this.musicbrainz.searchReleaseGroup(query);
		} catch (error) {
			throw this.mapMusicBrainzError(error);
		}

		result['release-groups'] = this.sortByExactMatch(result['release-groups'], query);
		await this.cache.set(cacheKey, JSON.stringify(result), SEARCH_TTL_SECONDS);
		return result;
	}

	private sortByExactMatch(
	releaseGroups: MusicBrainzReleaseGroupSearchResult['release-groups'],
	query: string,
	): MusicBrainzReleaseGroupSearchResult['release-groups'] {
	const normalizedQuery = query.trim().toLowerCase();
	return [...releaseGroups].sort((a, b) => {
		const aExact = a.title.trim().toLowerCase() === normalizedQuery;
		const bExact = b.title.trim().toLowerCase() === normalizedQuery;
		if (aExact && !bExact) return -1;
		if (!aExact && bExact) return 1;
			return 0;
	});
	}

	async getAlbumDetail(mbid: string): Promise < AlbumDetailDto > {
		const cacheKey = `album-detail:${mbid}`;
		const cached = await this.cache.get(cacheKey);
		if (cached) {
			return JSON.parse(cached);
		}

		let releaseGroup: MusicBrainzReleaseGroup;
		try {
			releaseGroup = await this.musicbrainz.getReleaseGroup(mbid);
		} catch (error) {
			if (axios.isAxiosError(error) && error.response?.status === 404) {
				throw new NotFoundException(`Album not found: ${mbid}`);
			}
			throw this.mapMusicBrainzError(error);
		}

		const artists: AlbumDetailDto['artists'] = (releaseGroup['artist-credit'] ?? []).map((credit) => ({
			mbid: credit.artist.id,
			name: credit.artist.name,
		}));

		const firstRelease = releaseGroup.releases?.[0];

		let tracks: AlbumDetailDto['tracks'] = [];
		let coverArtUrl: string | null = null;

		if (firstRelease) {
			try {
				const release = await this.musicbrainz.getRelease(firstRelease.id);
				tracks = (release.media ?? []).flatMap((medium) =>
					medium.tracks.map((track) => ({
							mbid: track.id,
							title: track.title,
							position: track.position,
					})),
				);
				coverArtUrl = await this.coverArt.getFrontCoverUrl(firstRelease.id);
			} catch (error) {
				if (axios.isAxiosError(error) && error.response?.status === 404) {
					throw new NotFoundException(`Release not found: ${firstRelease.id}`);
				}
				throw this.mapMusicBrainzError(error);
			}
		}

		const detail: AlbumDetailDto = {
			mbid: releaseGroup.id,
			title: releaseGroup.title,
			releaseDate: releaseGroup['first-release-date'],
			releaseYear: this.extractYear(releaseGroup['first-release-date']),
			coverArtUrl,
			artists,
			tracks,
		};

		await this.cache.set(cacheKey, JSON.stringify(detail), DETAIL_TTL_SECONDS);
		return detail;
	}

	async ensureAlbumImported(mbid: string): Promise<Album> {
		const existing = await this.prisma.album.findUnique({ where: { mbid } });
		if (existing) {
			return existing;
		}

		const detail = await this.getAlbumDetail(mbid);

		try {
			return await this.prisma.$transaction(async (tx) => {
					const album = await tx.album.create({
						data: {
							mbid: detail.mbid,
							title: detail.title,
							releaseDate: detail.releaseDate,
							releaseYear: detail.releaseYear,
							coverArtUrl: detail.coverArtUrl,
						},
					});

					for (const artistDto of detail.artists) {
						const artist = await tx.artist.upsert({
							where: { mbid: artistDto.mbid },
							update: {},
							create: { mbid: artistDto.mbid, name: artistDto.name },
						});
						await tx.albumArtist.create({
							data: { albumId: album.id, artistId: artist.id },
						});
					}

					if (detail.tracks.length > 0) {
						await tx.track.createMany({
							data: detail.tracks.map((track) => ({
									mbid: track.mbid,
									title: track.title,
									position: track.position,
									albumId: album.id,
							})),
						});
					}
					return album;
			});
		} catch (error: any) {
			if (error.code === 'P2002') {
					const album = await this.prisma.album.findUnique({ where: { mbid } });
					if (album)
						return album;
			}
			throw error;
		}
	}

private mapMusicBrainzError(error: unknown): Error {
		if (axios.isAxiosError(error)) {
			if (error.response?.status === 503) {
				return new ServiceUnavailableException('MusicBrainz is rate-limited, please try again in a moment');
			}

			if (!error.response) {
				return new ServiceUnavailableException('MusicBrainz is temporarily unreachable, please try again in a moment');
			}
		}
		return error instanceof Error ? error : new Error(String(error));
	}
	private extractYear(releaseDate?: string): number | undefined {
		if (!releaseDate) {
			return undefined;
		}
		const year = parseInt(releaseDate.slice(0, 4), 10);
		return isNaN(year) ? undefined : year;
	}
}