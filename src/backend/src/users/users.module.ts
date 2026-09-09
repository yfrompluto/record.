// ==========================================================
//		This module registers the users controller and service
//		& imports PrismaModule for database access. It then 
//		exports UsersModule for use in other modules
// ==========================================================

import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
	imports: [PrismaModule],
	controllers: [UsersController],
	providers: [UsersService],
	exports: [UsersService],
})
export class UsersModule {}