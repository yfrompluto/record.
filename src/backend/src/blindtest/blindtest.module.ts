import { Module } from '@nestjs/common';
import { HttpModule}  from '@nestjs/axios';
import { BlindtestGateway } from './blindtest.gateway';
import { BlindtestService } from './blindtest.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
	imports: [HttpModule, PrismaModule],
	providers: [BlindtestGateway, BlindtestService],
})
export class BlindtestModule {}