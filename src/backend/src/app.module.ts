// ============================================================
//		Root application module.
//		Import all main feature modules & registers the app 
//		controller and service usree as a base if the NestJS app.
// ============================================================

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VaultModule } from './vault/vault.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { FriendsModule } from './friends/friends.module';
import { ExploreModule } from './music/explore/explore.module';
import { HealthModule } from './health/health.module';
import { ChatModule } from './chat/chat.module';
import { MusicModule } from './music/music.module';
import { RatingModule } from './music/rating/rating.module';
import { CollectionModule } from './music/collection/collection.module';
import { PlaylistModule } from './music/playlist/playlist.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BlindtestModule } from './blindtest/blindtest.module';

@Module({
	imports: [EventEmitterModule.forRoot(), VaultModule, AuthModule, UsersModule, PrismaModule, FriendsModule, ExploreModule, HealthModule, ChatModule, MusicModule, RatingModule, CollectionModule, PlaylistModule, NotificationsModule, BlindtestModule],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
