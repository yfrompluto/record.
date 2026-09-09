import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	OnGatewayConnection,
	OnGatewayDisconnect,
	MessageBody,
	ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { BlindtestService } from './blindtest.service';

interface JoinRoomPayload {
	sessionId: string;
}

interface SubmitAnswerPayload {
	sessionId: string;
	selectedDeezerId: number;
}

interface LeaveGamePayload {
	sessionId: string;
}

@WebSocketGateway({
	cors: { origin: true, credentials: true },
})
export class BlindtestGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;
	private roundDeadlines = new Map<number, { roundId: number; deadline: number }>();

	constructor(
		private readonly jwtService: JwtService,
		private readonly prisma: PrismaClient,
		private readonly blindtestService: BlindtestService,
	) {}

	async handleConnection(client: Socket) {
		try {
			const token = this.extractTokenFromCookie(client);
			if (!token) throw new Error('No token');

			const payload = await this.jwtService.verifyAsync(token);
			client.data.userId = payload.sub;

			console.log(`[blindtest] user ${payload.sub} connected`);
		}	catch (err) {
			console.error('[blindtest] handshake rejected:', err);
			client.disconnect();
		}
	}

	handleDisconnect(client: Socket) {
		console.log(`[blindtest] user ${client.data.userId} disconnected`);
	}

	@SubscribeMessage('joinBlindtestRoom')
	async handleJoinRoom(
		@ConnectedSocket() client: Socket,
		@MessageBody() payload: JoinRoomPayload,
	) {
		const userId = client.data.userId;
		if (!userId) return;

		client.join(payload.sessionId);

		try {
			const { playerCount, hostUserId } = await this.blindtestService.joinGame(payload.sessionId, userId);

			this.server.to(payload.sessionId).emit('playerJoined', {
				userId,
				playerCount,
				hostUserId,
			});
		} catch (err) {
			console.error('[blindtest] joinGame failed:', err.message);
			client.emit('error', { message: err.message });
		}
	}

	@SubscribeMessage('startGame')
	async handleStartGame(
		@ConnectedSocket() client: Socket,
		@MessageBody() payload: JoinRoomPayload,
	) {
		const userId = client.data.userId;
		const game = await this.prisma.blindtestGame.findUnique({
			where: { sessionId: payload.sessionId },
		});
		if (!game) return;
		if (game.status === 'FINISHED') {
			client.emit('error', { message: 'This game is already finished' });
			return;
		}
		if (game.hostUserId !== userId) {
			client.emit('error', { message: 'Only the host can start the game' });
			return;
		}

		await this.startNextRound(payload.sessionId, game.id);
	}

	@SubscribeMessage('submitAnswer')
	async handleSubmitAnswer(
		@ConnectedSocket() client: Socket,
		@MessageBody() payload: SubmitAnswerPayload,
	) {
		const userId = client.data.userId;
		if (!userId) return;

		const game = await this.prisma.blindtestGame.findUnique({
			where: { sessionId: payload.sessionId },
		});
		if (!game) return;

		const deadlineInfo = this.roundDeadlines.get(game.id);
		if (!deadlineInfo || Date.now() > deadlineInfo.deadline) {
			client.emit('error', { message: 'Time is up for this round' });
			return;
		}

		try {
			const result = await this.blindtestService.submitAnswer(
				payload.sessionId,
				userId,
				payload.selectedDeezerId,
			);

			this.server.to(payload.sessionId).emit('answerResult', {
				userId,
				isCorrect: result.isCorrect,
				selectedDeezerId: payload.selectedDeezerId,
			});
		} catch (err) {
			console.error('[blindtest] submitAnswer failed:', err.message);
			client.emit('error', { message: err.message });
		}
	}

	@SubscribeMessage('leaveGame')
	async handleLeaveGame(
		@ConnectedSocket() client: Socket,
		@MessageBody() payload: LeaveGamePayload,
	) {
		const userId = client.data.userId;
		if (!userId) return;

		try {
			const { playerCount, hostUserId } = await this.blindtestService.leaveGame(payload.sessionId, userId);

			client.leave(payload.sessionId);

			this.server.to(payload.sessionId).emit('playerLeft', {
				userId,
				playerCount,
				hostUserId,
			});
		} catch (err) {
			console.error('[blindtest] leaveGame failed:', err.message);
		}
	}

	private extractTokenFromCookie(client: Socket): string | undefined {
		const cookies = client.handshake.headers.cookie;
		if (!cookies) return undefined;

		const match = cookies.split(';').find((c) => c.trim().startsWith('access_token='));
		return match?.split('=')[1];
	}

	private async endRound(sessionId: string, gameId: number, roundId: number) {
		const current = this.roundDeadlines.get(gameId);

		if (!current || current.roundId !== roundId) return;

		this.roundDeadlines.delete(gameId);

		const round = await this.prisma.blindtestRound.findUnique({
			where: { id: roundId },
		});

		this.server.to(sessionId).emit('roundEnded', {
			trackTitle: round?.trackTitle,
			trackArtist: round?.trackArtist,
		});

		if (round && round.roundNumber >= 10) {
			const leaderboard = await this.blindtestService.finishGame(gameId);

			this.server.to(sessionId).emit('gameEnded', {
				leaderboard,
			});
		} else {
			setTimeout(() => {
				this.startNextRound(sessionId, gameId);
			}, 3000);
		}
	}

	private async startNextRound(sessionId: string, gameId: number) {
		const game = await this.prisma.blindtestGame.findUnique({
			where: { id: gameId },
		});
		if (!game || game.status === 'FINISHED') return;

		const { round, choices } = await this.blindtestService.startRound(gameId);

		const deadline = Date.now() + 15000;
		this.roundDeadlines.set(gameId, { roundId: round.id, deadline });

		this.server.to(sessionId).emit('roundStarted', {
			previewUrl: round.trackPreviewUrl,
			duration: 15,
			choices,
			roundNumber: round.roundNumber,
			totalRounds: 10,
		});

		setTimeout(() => {
			this.endRound(sessionId, gameId, round.id);
		}, 15000);
	}
}