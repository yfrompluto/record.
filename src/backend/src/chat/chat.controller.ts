import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import { PrismaClient } from '@prisma/client';

@UseGuards(AuthGuard)
@Controller('chat')
export class ChatController {
	constructor(private readonly prisma: PrismaClient) {}

	// @Get('history/:userId')
	// async getHistory(@Req() req: AuthenticatedRequest, @Param('userId', ParseIntPipe) userId: number) {
	// 	return this.prisma.message.findMany({
	// 		where: {
	// 			OR: [
	// 				{ senderId: req.user.sub, receiverId: userId },
	// 				{ senderId: userId, receiverId: req.user.sub },
	// 			],
	// 		},
	// 		orderBy: { createdAt: 'asc' },
	// 		include: {
	// 			sender: {select: { id: true, username: true, displayName: true, avatarFilename: true } },
	// 		},
	// 	});
	// }

	@Get('history/:userId')
	async getHistory(
		@Req() req: AuthenticatedRequest,
		@Param('userId', ParseIntPipe) userId: number
	) {
		console.log("USER FROM TOKEN:", req.user);

		return this.prisma.message.findMany({
			where: {
				OR: [
					{ senderId: req.user.sub, receiverId: userId },
					{ senderId: userId, receiverId: req.user.sub },
				],
			},
			orderBy: { createdAt: 'asc' },
		});
	}
}