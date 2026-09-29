// =====================================================================
//	Central registry of business events that trigger notifications.
//	Emitting modules (Friends, Chat, Rating) import the event names
// 	and payload shapes from here — NotificationsService listens.
// =====================================================================

export const NOTIFICATION_EVENTS = {
	FRIEND_REQUEST: 'friend.request.created',
	FRIEND_REQUEST_ACCEPTED: 'friend.request.accepted',
	NEW_MESSAGE: 'message.created',
	FRIEND_ALBUM_RATED: 'album.rated.by.friend',
	RATING_LIKED: 'rating.liked',
	RATING_DELETED: 'rating.deleted',
} as const;

export interface FriendRequestCreatedPayload {
	friendshipId: number;
	requesterId: number;
	addresseeId: number;
}

export interface FriendRequestAcceptedPayload {
	friendshipId: number;
	requesterId: number;
	addresseeId: number;
}

export interface NewMessagePayload {
	messageId: number;
	senderId: number;
	receiverId: number;
}

export interface FriendAlbumRatedPayload {
	albumRatingId: number;
	albumMbid: string;
	actorId: number;
	recipientId: number;
}

export interface RatingLikedPayload {
	albumRatingId: number;
	actorId: number;
	recipientId: number;
	albumMbid?: string;
	albumTitle?: string;
}

export interface RatingDeletedPayload {
	actorId: number;
	recipientId: number;
	albumMbid: string;
	albumTitle: string;
}