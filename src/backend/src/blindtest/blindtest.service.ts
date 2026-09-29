import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { PrismaClient } from '@prisma/client';

interface DeezerTrack{
	id: number;
	title: string;
	preview: string;
	artist: {
		id: number;
		name: string;
	};
	album: {
		title: string;
		cover_medium: string;
	};
}

@Injectable()
export class BlindtestService {
	private readonly allowedGenreIds = [
		132, 116, 152, 113, 165, 85, 106, 466, 144, 129,
		52, 84, 98, 464, 169, 153, 197, 2, 12, 16, 75, 81,
	];

	constructor(
		private readonly httpService: HttpService,
		private readonly prisma: PrismaClient,
	) {}

	async getRandomTrack(genreId?: number): Promise<DeezerTrack> {
		const selectedGenreId =
			genreId ?? this.allowedGenreIds[Math.floor(Math.random() * this.allowedGenreIds.length)];

		const response: AxiosResponse<{ data: DeezerTrack[] }> = await firstValueFrom(
			this.httpService.get(`https://api.deezer.com/chart/${selectedGenreId}/tracks`),
		);

		const tracks: DeezerTrack[] = response.data.data;

		if (!tracks || tracks.length === 0) {
			throw new Error('No tracks found');
		}

		const randomIndex = Math.floor(Math.random() * tracks.length);
		return tracks[randomIndex];
	}

	async getRandomTracks(count: number, excludeIds: number[] = []): Promise<DeezerTrack[]> {
		const results: DeezerTrack[] = [];
		const usedIds = new Set(excludeIds);

		while (results.length < count) {
			const track = await this.getRandomTrack();
			if (!usedIds.has(track.id)) {
				usedIds.add(track.id);
				results.push(track);
			}
		}

		return results;
	}

	async joinGame(sessionId: string, userId: number) {
		let game = await this.prisma.blindtestGame.findUnique({
			where: { sessionId },
		});

		if (!game) {
			game = await this.prisma.blindtestGame.create({
				data: { sessionId, hostUserId: userId },
			});
		}

		const existingPlayer = await this.prisma.blindtestPlayer.findUnique({
			where: {
				userId_gameId: { userId, gameId: game.id },
			},
		});

		if (!existingPlayer) {
			const playerCount = await this.prisma.blindtestPlayer.count({
				where: { gameId: game.id, hasLeft: false },
			});

			if (playerCount >= 10) {
				throw new Error('This game room is full (10 players max)');
			}

			await this.prisma.blindtestPlayer.create({
				data: { userId, gameId: game.id },
			});
		} else if (existingPlayer.hasLeft) {
			await this.prisma.blindtestPlayer.update({
				where: { id: existingPlayer.id },
				data: { hasLeft: false },
			});
		}

		const playerCount = await this.prisma.blindtestPlayer.count({
			where: { gameId: game.id, hasLeft: false },
		});

		return { game, playerCount, hostUserId: game.hostUserId };
	}

	async startRound(gameId: number) {
		const roundCount = await this.prisma.blindtestRound.count({
			where: { gameId },
		});

		const track = await this.getRandomTrack();
		const decoyTracks = await this.getRandomTracks(3, [track.id]);

		const round = await this.prisma.blindtestRound.create({
			data: {
				gameId,
				roundNumber: roundCount + 1,
				trackDeezerId: track.id,
				trackTitle: track.title,
				trackArtist: track.artist.name,
				trackPreviewUrl: track.preview,
			},
		});

		const choices = [track, ...decoyTracks].map((t) => ({
			deezerId: t.id,
			title: t.title,
			artist: t.artist.name,
		}));

		const shuffledChoices = choices.sort(() => Math.random() - 0.5);

		return { round, choices: shuffledChoices };
	}

	async submitAnswer(sessionId: string, userId: number, selectedDeezerId: number) {
		const game = await this.prisma.blindtestGame.findUnique({
			where: { sessionId },
		});
		if (!game) throw new Error('Game not found');

		const round = await this.prisma.blindtestRound.findFirst({
			where: { gameId: game.id },
			orderBy: { roundNumber: 'desc' },
		});
		if (!round) throw new Error('No round in progress');

		const player = await this.prisma.blindtestPlayer.findUnique({
			where: {
				userId_gameId: { userId, gameId: game.id },
			},
		});
		if (!player) throw new Error('Player not in this game');

		const isCorrect = BigInt(selectedDeezerId) === round.trackDeezerId;

		const answer = await this.prisma.blindtestAnswer.create({
			data: {
				playerId: player.id,
				roundId: round.id,
				answerText: String(selectedDeezerId),
				isCorrect,
			},
		});

		if (isCorrect) {
			await this.prisma.blindtestPlayer.update({
				where: { id: player.id },
				data: { score: { increment: 10 } },
			});
		}

		return { isCorrect, answer };
	}

	async finishGame(gameId: number) {
		await this.prisma.blindtestGame.update({
			where: { id: gameId },
			data: {
				status: 'FINISHED',
				finishedAt: new Date(),
			},
		});

		const players = await this.prisma.blindtestPlayer.findMany({
			where: { gameId, hasLeft: false },
			orderBy: { score: 'desc' },
			include: {
				user: { select: { id: true, username: true, displayName: true } },
			},
		});

		return players.map((p) => ({
			userId: p.userId,
			username: p.user.username,
			displayName: p.user.displayName,
			score: p.score,
		}));
	}

	async leaveGame(sessionId: string, userId: number) {
		const game = await this.prisma.blindtestGame.findUnique({
			where: { sessionId },
		});
		if (!game) throw new Error('Game not found');

		const player = await this.prisma.blindtestPlayer.findUnique({
			where: {
				userId_gameId: { userId, gameId: game.id },
			},
		});
		if (!player || player.hasLeft) {
			return { playerCount: 0, hostUserId: game.hostUserId };
		}

		await this.prisma.blindtestPlayer.update({
			where: { id: player.id },
			data: { hasLeft: true },
		});

		let newHostUserId = game.hostUserId;

		if (game.hostUserId === userId) {
			const nextHost = await this.prisma.blindtestPlayer.findFirst({
				where: { gameId: game.id, hasLeft: false },
				orderBy: { id: 'asc' },
			});

			newHostUserId = nextHost ? nextHost.userId : null;

			await this.prisma.blindtestGame.update({
				where: { id: game.id },
				data: { hostUserId: newHostUserId },
			});
		}

		const playerCount = await this.prisma.blindtestPlayer.count({
			where: { gameId: game.id, hasLeft: false },
		});

		return { playerCount, hostUserId: newHostUserId };
	}
}
