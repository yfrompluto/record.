// =====================================================================
//		Exposes REST endpoints for friend requests, friendships listing,
//		and blocking. Requires authentication via AuthGuard.
// =====================================================================

import { Controller, Get, Post, Delete, Param, Body, UseGuards,Req, ParseIntPipe } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendRequestDto } from './dto/friend-request.dto';
import { RespondRequestDto } from './dto/respond-request.dto';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface'
import { ChatGateway } from '../chat/chat.gateway';

@UseGuards(AuthGuard)
@Controller('friends')
export class FriendsController {
	constructor(
		private readonly friendsService: FriendsService,
		private readonly chatGateway: ChatGateway
	) {}

	@Post('requests')
	sendRequest(@Req() req: AuthenticatedRequest, @Body() dto: FriendRequestDto) {
		return this.friendsService.sendRequest(req.user.sub, dto.addresseeId);
	}

	@Post('requests/:id/respond')
	respondToRequest(
		@Req() req: AuthenticatedRequest,
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: RespondRequestDto,
	) {
		return this.friendsService.respondToRequest(req.user.sub, id, dto.status);
	}

	@Get('requests')
	getPendingRequests(@Req() req: AuthenticatedRequest) {
		return this.friendsService.getPendingRequests(req.user.sub);
	}

	@Get()
	getFriendsList(@Req() req: AuthenticatedRequest) {
		return this.friendsService.getFriendsList(req.user.sub);
	}

	@Delete(':id')
	async removeFriend(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
		const result = await this.friendsService.removeFriends(req.user.sub, id);
		this.chatGateway.notifyFriendRemoved(result.otherUserId, req.user.sub);
		return result;
	}

	@Post('block/:userId')
	blockUser(@Req() req: AuthenticatedRequest, @Param('userId', ParseIntPipe) userId: number) {
		return this.friendsService.blockUser(req.user.sub, userId);
	}

	@Delete('block/:userId')
	unblockUser(@Req() req: AuthenticatedRequest, @Param('userId', ParseIntPipe) userId: number) {
		return this.friendsService.unblockUser(req.user.sub, userId);
	}

	@Get('blocked')
	getBlockedUsers(@Req() req: AuthenticatedRequest) {
		return this.friendsService.getBlockedUsers(req.user.sub);
	}

	@Get('status/:userId')
	getStatus(@Req() req: AuthenticatedRequest, @Param('userId', ParseIntPipe) userId: number) {
		return this.friendsService.getRelationshipStatus(req.user.sub, userId);
	}
}