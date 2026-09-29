// =====================================================================
//		Handles friend requests, friendships, and blocking logic.
// =====================================================================

import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notifications/events/notification-events';

@Injectable()
export class FriendsService {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly eventEmitter: EventEmitter2,
	) {}

	// ---- Friend requests ----

	async sendRequest(requesterId: number, addresseeId: number) {
		if (requesterId === addresseeId) {
			throw new ForbiddenException('You cannot add yourself as a friends');
		}

		const addressee = await this.prisma.user.findUnique({ where: { id: addresseeId } });
		if (!addressee) {
			throw new NotFoundException('User not found');
		}

		await this.ensureNotBlocked(requesterId, addresseeId);

		const existing = await this.prisma.friendship.findFirst({
			where: {
				OR: [
					{ requesterId, addresseeId },
					{ requesterId: addresseeId, addresseeId: requesterId },
				],
			},
		});

		if (existing) {
			throw new ConflictException('A friendship or request already exists between these users');
		}

		const friendship = await this.prisma.friendship.create({
			data: { requesterId, addresseeId, status: 'PENDING' },
		});

		this.eventEmitter.emit(NOTIFICATION_EVENTS.FRIEND_REQUEST, {
			friendshipId: friendship.id,
			requesterId: friendship.requesterId,
			addresseeId: friendship.addresseeId,
		});
		return friendship;
	}

	async respondToRequest(userId: number, friendshipId: number, status: 'ACCEPTED' | 'DECLINED') {
		const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });

		if (!friendship)
			throw new NotFoundException('Friend request not found');
		if (friendship.addresseeId !== userId) {
			throw new ForbiddenException('You cannot respond to this request');
		}
		if (friendship.status !== 'PENDING') {
			throw new ConflictException('This request has already been answered');
		}

		if (status === 'DECLINED') {
			await this.prisma.friendship.delete({where: {id: friendshipId } });
			return { status: 'DECLINED' };
		}

		const updated = await this.prisma.friendship.update({
			where: { id: friendshipId },
			data: { status },
		});

		this.eventEmitter.emit(NOTIFICATION_EVENTS.FRIEND_REQUEST_ACCEPTED, {
			friendshipId: updated.id,
			requesterId: updated.requesterId,
			addresseeId: updated.addresseeId,
		});

		return updated;
	}

	async removeFriends(userId: number, friendshipId: number) {
		const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });

		if (!friendship)
			throw new NotFoundException('Friendship not found');
		if(friendship.requesterId !== userId && friendship.addresseeId !== userId) {
			throw new ForbiddenException('You are not part of this friendship');
		}

		const otherUserId = friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId;

		await this.prisma.friendship.delete({ where: { id: friendshipId } });
		return { otherUserId };
	}

	async getFriendsList(userId: number) {
		const friendships = await this.prisma.friendship.findMany({
			where: {
				status: 'ACCEPTED',
				OR: [{ requesterId: userId }, { addresseeId: userId }],
			},
			include: {
				requester: { select: { id: true, username: true, displayName: true, avatarFilename: true } },
				addressee: { select: { id: true, username: true, displayName: true, avatarFilename: true } },
			},
		});

		// Return the "other" user in each friendship, not the current user
		return friendships.map((f) => {
			const other = f.requesterId === userId ? f.addressee : f.requester;
			return { ...other, friendshipId: f.id };
		});
	}

	async getPendingRequests(userId: number) {
		return this.prisma.friendship.findMany({
			where: { addresseeId: userId, status: 'PENDING' },
			include: {
				requester: { select: { id: true, username: true, displayName: true, avatarFilename: true } },
			},
		});
	}

	// ---- Blocking ----

	async blockUser(blockerId: number, blockedId: number) {
		if (blockerId === blockedId) {
			throw new ForbiddenException('You cannot block yourself');
		}

		const existing = await this.prisma.block.findUnique({
			where: { blockerId_blockedId: { blockerId, blockedId } },
		});
		if (existing)
			throw new ConflictException('User is already blocked');

		//Blocking also remove any existing friendship between the two users
		await this.prisma.friendship.deleteMany({
			where: {
				OR: [
					{ requesterId: blockerId, addresseeId: blockedId },
					{ requesterId: blockedId, addresseeId: blockerId },
				],
			},
		});

		return this.prisma.block.create({ data: { blockerId, blockedId } });
	}

	async unblockUser(blockerId: number, blockedId: number) {
		const existing = await this.prisma.block.findUnique({
			where: { blockerId_blockedId: { blockerId, blockedId } },
		});
		if (!existing) {
			throw new NotFoundException('This user is not blocked');
		}

		return this.prisma.block.delete({
			where: { blockerId_blockedId: { blockerId, blockedId } },
		});
	}

	async getBlockedUsers(blockerId: number) {
		const blocks = await this.prisma.block.findMany({
			where: { blockerId },
			include: {
				blocked: { select: { id: true, username: true, displayName: true, avatarFilename: true } },
			},
		});
		return blocks.map((b) => b.blocked);
	}

	private async ensureNotBlocked(userA: number, userB: number) {
		const block = await this.prisma.block.findFirst({
			where: {
				OR: [
					{ blockerId: userA, blockedId: userB },
					{ blockerId: userB, blockedId: userA },
				],
			},
		});
		if (block) throw new ForbiddenException('Cannot interact with this user');
	}

	async getRelationshipStatus(currentUserId: number, targetUserId: number) {
		if (currentUserId === targetUserId)
			return { status: 'SELF' as const };

		const block = await this.prisma.block.findFirst({
			where: {
				OR: [
					{ blockerId: currentUserId, blockedId: targetUserId },
					{ blockerId: targetUserId, blockedId: currentUserId },
				],
			},
		});
		if (block) {
			return { status: block.blockerId === currentUserId ? 'BLOCKED_BY_ME' as const : 'BLOCKED_BY_THEM' as const };
		}

		const friendship = await this.prisma.friendship.findFirst({
			where: {
				OR: [
					{ requesterId: currentUserId, addresseeId: targetUserId },
					{ requesterId: targetUserId, addresseeId: currentUserId}
				],
			},
		});

		if (!friendship)
			return { status: 'NONE' as const };
		if (friendship.status === 'ACCEPTED')
			return { status: 'FRIENDS' as const, friendshipId: friendship.id };
		if (friendship.status === 'PENDING') {
			return {
				status: friendship.requesterId === currentUserId ? 'PENDING_SENT' as const : 'PENDING_RECEIVED' as const,
				friendshipId: friendship.id,
			};
		}
		return { status: 'NONE' as const};
	}
}