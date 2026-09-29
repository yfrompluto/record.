import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';

@Module({
	imports: [PrismaModule],
	controllers: [ExploreController],
	providers: [ExploreService],
	exports: [ExploreService],
})
export class ExploreModule {}