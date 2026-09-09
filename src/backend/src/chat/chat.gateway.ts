// =====================================================================
//		Real-time chat gateway. Handles socket connections, tracks which
//		user is on which socket, and relays text messages between users.
// =====================================================================

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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notifications/events/notification-events';
import { randomUUID } from 'crypto';
import { Subscriber } from 'rxjs';

interface SendMessagePayload {
	receiverId: number;
	content: string;
}
interface ShareAlbumPayload {
	receiverId: number;
	albumMbid: string;
	content?: string;
}
interface TypingPayload {
	receiverId: number;
}
interface MarkAsReadPayload {
	senderId: number;
}

interface InviteBlindTestPayload {
	receiverId: number;
	sessionId?: string;
}

@WebSocketGateway({
	cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	// Maps userId -> socketId, so we know where to send a message
	private onlineUsers = new Map<number, string>();

	constructor(
		private readonly jwtService: JwtService,
		private readonly prisma: PrismaClient,
		private readonly eventEmitter: EventEmitter2,
	) {}

	async handleConnection(client: Socket) {
		try {
			const token = this.extractTokenFromCookie(client);
			if (!token) throw new Error('No token');

			const payload = await this.jwtService.verifyAsync(token);
			const userId = payload.sub;

			client.data.userId = userId;
			this.onlineUsers.set(userId, client.id);

			// who is online right now
			client.emit('onlineUsers', Array.from(this.onlineUsers.keys()));

			// user just came online
			client.broadcast.emit('presenceUpdate', { userId, online: true });

			console.log(`[chat] user ${userId} connected`);
		} catch (err){
			console.error('[chat] handshake rejected:', err);
			client.disconnect();
		}
	}

	handleDisconnect(client: Socket) {
		const userId = client.data.userId;
		if (userId) {
			this.onlineUsers.delete(userId);
			this.server.emit('presenceUpdate', { userId, online: false });
			console.log(`[chat] user ${userId} disconnected`);
		}
	}

	@SubscribeMessage('sendMessage')
	async handleMessage (
		@ConnectedSocket() client: Socket,
		@MessageBody() payload: SendMessagePayload,
	) {
		const senderId = client.data.userId;
		if (!senderId) return;

		const message = await this.prisma.message.create({
			data: {
				senderId,
				receiverId: payload.receiverId,
				content: payload.content,
				type: 'text',
			},
			include: {
				sender: { select: { id: true, username: true, displayName: true, avatarFilename: true } },
			},
		});

		//add for notification
		this.eventEmitter.emit(NOTIFICATION_EVENTS.NEW_MESSAGE, {
			messageId: message.id,
			senderId: message.senderId,
			receiverId: message.receiverId,
		});

		// Send to the receiver if they're online
		const receiverSocketId = this.onlineUsers.get(payload.receiverId);
		if (receiverSocketId) {
			this.server.to(receiverSocketId).emit('newMessage', message);
		}

		client.emit('newMessage', message);
	}

	@SubscribeMessage('shareAlbum')
	async handleShareAlbum(
		@ConnectedSocket() client: Socket,
		@MessageBody() payload: ShareAlbumPayload,
	) {
		const senderId = client.data.userId;
		if (!senderId) return;

		const message = await this.prisma.message.create({
			data: {
				senderId,
				receiverId: payload.receiverId,
				content: payload.content || '',
				type: 'album',
				albumMbid: payload.albumMbid,
			},
			include: {
				sender: { select: { id: true, username: true, displayName: true, avatarFilename: true } },
			},
		});

		this.eventEmitter.emit(NOTIFICATION_EVENTS.NEW_MESSAGE, {
			messageId: message.id,
			senderId: message.senderId,
			receiverId: message.receiverId,
		});

		const receiverSocketId = this.onlineUsers.get(payload.receiverId);
		if (receiverSocketId) {
			this.server.to(receiverSocketId).emit('newMessage', message);
		}
		client.emit('newMessage', message);
	}

	
	@SubscribeMessage('inviteBlindTest')
	async handleInviteBlindTest(
		@ConnectedSocket() client: Socket,
		@MessageBody() payload: InviteBlindTestPayload,
	) {
		const senderId = client.data.userId;
		if (!senderId) return;

		const sessionId = payload.sessionId || randomUUID();

		const message = await this.prisma.message.create({
			data: {
				senderId,
				receiverId: payload.receiverId,
				content: sessionId,
				type: 'blindtest',
			},
			include: {
				sender: { select: { id: true, username: true, displayName: true, avatarFilename: true } },
			},
		});

		this.eventEmitter.emit(NOTIFICATION_EVENTS.NEW_MESSAGE, {
			messageId: message.id,
			senderId: message.senderId,
			receiverId: message.receiverId,
		});

		const receiverSocketId = this.onlineUsers.get(payload.receiverId);
		if (receiverSocketId) {
			this.server.to(receiverSocketId).emit('newMessage', message);
		}
		client.emit('newMessage', message);
	}

	@SubscribeMessage('typing')
	handleTyping(@ConnectedSocket() client: Socket, @MessageBody() payload: TypingPayload) {
		const senderId = client.data.userId;
		if (!senderId) return;

		const receiverSocketId = this.onlineUsers.get(payload.receiverId);
		if (receiverSocketId) {
			this.server.to(receiverSocketId).emit('userTyping', {userId: senderId });	
		}
	}

	@SubscribeMessage('stopTyping')
	handleStopTyping(@ConnectedSocket() client: Socket, @MessageBody() payload: TypingPayload) {
		const senderId = client.data.userId;
		if (!senderId) return;

		const receiverSocketId = this.onlineUsers.get(payload.receiverId);
		if (receiverSocketId) {
			this.server.to(receiverSocketId).emit('userStoppedTyping', { userId: senderId });
		}
	}

	@SubscribeMessage('markAsRead')
	async handleMarkAsRead(@ConnectedSocket() client: Socket, @MessageBody() payload: MarkAsReadPayload) {
		const receiverId = client.data.userId;
		if (!receiverId) return;

		await this.prisma.message.updateMany({
			where: { senderId: payload.senderId, receiverId, isRead: false},
			data: { isRead: true},
		});

		const senderSocketId = this.onlineUsers.get(payload.senderId);
		if (senderSocketId) {
			this.server.to(senderSocketId).emit('messageRead', { readerId: receiverId });
		}
	}

	private extractTokenFromCookie(client: Socket): string | undefined {
		const cookies = client.handshake.headers.cookie;
		if (!cookies) return undefined;

		const match = cookies.split(';').find((c) => c.trim().startsWith('access_token='));
		return match?.split('=')[1];
	}

	notifyFriendRemoved(targetUserId: number, removedByUserId: number) {
		const socketId = this.onlineUsers.get(targetUserId);
		if (socketId) {
			this.server.to(socketId).emit('friendRemoved', { removedBy: removedByUserId });
		}
	}
}
