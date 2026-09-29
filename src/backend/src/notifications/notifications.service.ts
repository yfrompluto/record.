// =====================================================================
//          Listens for business events (friend request, message, rating)
//          and persists them as notifications. Also exposes read-side
//          methods consumed by NotificationsController.
// =====================================================================

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaClient } from '@prisma/client';
import { NotificationType, Prisma } from '@prisma/client';
import { NOTIFICATION_EVENTS } from './events/notification-events';
import type {
	FriendRequestCreatedPayload,
	FriendRequestAcceptedPayload,
	NewMessagePayload,
	FriendAlbumRatedPayload,
	RatingLikedPayload,
	RatingDeletedPayload,
} from './events/notification-events';

@Injectable()
export class NotificationsService {
	constructor(private readonly prisma: PrismaClient) {}

	// ---- Event listeners: one per business event, creates the DB row ----

	@OnEvent(NOTIFICATION_EVENTS.FRIEND_REQUEST)
	onFriendRequest(payload: FriendRequestCreatedPayload) {
		return this.create({
			type: NotificationType.FRIEND_REQUEST,
			recipientId: payload.addresseeId,
			actorId: payload.requesterId,
			payload: { friendshipId: payload.friendshipId },
		});
	}

	@OnEvent(NOTIFICATION_EVENTS.FRIEND_REQUEST_ACCEPTED)
	onFriendRequestAccepted(payload: FriendRequestAcceptedPayload) {
		return this.create({
			type: NotificationType.FRIEND_REQUEST_ACCEPTED,
			recipientId: payload.requesterId,
			actorId: payload.addresseeId,
			payload: { friendshipId: payload.friendshipId },
		});
	}

	@OnEvent(NOTIFICATION_EVENTS.NEW_MESSAGE)
	onNewMessage(payload: NewMessagePayload) {
		return this.create({
			type: NotificationType.NEW_MESSAGE,
			recipientId: payload.receiverId,
			actorId: payload.senderId,
			payload: { messageId: payload.messageId },
		});
	}

	@OnEvent(NOTIFICATION_EVENTS.FRIEND_ALBUM_RATED)
	onFriendAlbumRated(payload: FriendAlbumRatedPayload) {
		return this.create({
			type: NotificationType.FRIEND_ALBUM_RATED,
			recipientId: payload.recipientId,
			actorId: payload.actorId,
			payload: { albumRatingId: payload.albumRatingId, albumMbid: payload.albumMbid },
		});
	}
	
	@OnEvent(NOTIFICATION_EVENTS.RATING_LIKED)
	onRatingLiked(payload: RatingLikedPayload) {
		return this.create({
			type: NotificationType.RATING_LIKED,
			recipientId: payload.recipientId,
			actorId: payload.actorId,
			payload: {albumRatingId: payload.albumRatingId, albumMbid: payload.albumMbid, albumTitle: payload.albumTitle },
		});
	}

	@OnEvent(NOTIFICATION_EVENTS.RATING_DELETED)
	onRatingDeleted(payload: RatingDeletedPayload) {
		return this.create({
			type: NotificationType.RATING_DELETED,
			recipientId: payload.recipientId,
			actorId: payload.actorId,
			payload: { albumMbid: payload.albumMbid, albumTitle: payload.albumTitle },
		});
	}

	private create(data: {
		type: NotificationType;
		recipientId: number;
		actorId?: number;
		payload?: Prisma.InputJsonValue;
	}) {
		return this.prisma.notification.create({ data });
	}

	// ---- Read-side, consumed by the controller ----

	findForUser(userId: number) {
		return this.prisma.notification.findMany({
			where: { recipientId: userId },
			orderBy: { createdAt: 'desc' },
			take: 50,
			include: {
				actor: {
					select: { id: true, username: true, displayName: true, avatarFilename: true },
				},
			},
		});
	}

	countUnread(userId: number) {
		return this.prisma.notification.count({
			where: { recipientId: userId, isRead: false },
		});
	}

	markAsRead(userId: number, id: number) {
		return this.prisma.notification.updateMany({
			where: { id, recipientId: userId },
			data: { isRead: true },
		});
	}

	markAllAsRead(userId: number) {
		return this.prisma.notification.updateMany({
			where: { recipientId: userId, isRead: false },
			data: { isRead: true },
		});
	}
}