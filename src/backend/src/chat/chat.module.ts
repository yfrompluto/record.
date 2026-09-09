import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatController } from './chat.controller';

@Module({
	imports: [PrismaModule],
	providers: [ChatGateway],
	controllers: [ChatController],
	exports: [ChatGateway],
})
export class ChatModule {}

