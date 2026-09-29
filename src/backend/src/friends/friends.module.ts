import { Module } from '@nestjs/common'
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';

@Module({
	imports: [PrismaModule, ChatModule],
	controllers: [FriendsController],
	providers: [FriendsService],
})
export class FriendsModule {}