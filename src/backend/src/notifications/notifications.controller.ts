// =====================================================================
//          Exposes REST endpoints to list, count, and mark notifications
//          as read. Requires authentication via AuthGuard.
// =====================================================================

import { Controller, Get, Post, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';

@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
	constructor(private readonly notificationsService: NotificationsService) {}

	@Get()
	getNotifications(@Req() req: AuthenticatedRequest) {
		return this.notificationsService.findForUser(req.user.sub);
	}

	@Get('unread-count')
	getUnreadCount(@Req() req: AuthenticatedRequest) {
		return this.notificationsService.countUnread(req.user.sub);
	}

	@Post(':id/read')
	markAsRead(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
		return this.notificationsService.markAsRead(req.user.sub, id);
	}

	@Post('read-all')
	markAllAsRead(@Req() req: AuthenticatedRequest) {
		return this.notificationsService.markAllAsRead(req.user.sub);
	}
}