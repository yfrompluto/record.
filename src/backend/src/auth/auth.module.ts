import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { VaultModule } from '../vault/vault.module';
import { VaultService } from '../vault/vault.service';
import { AuthGuard } from './auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
	imports: [
		PrismaModule, UsersModule,
		JwtModule.registerAsync({
			global: true,
			imports: [VaultModule],
			inject: [VaultService],
			useFactory: (vaultService: VaultService) => ({
			secret: vaultService.getSecrets().jwtSecret,
			signOptions: { expiresIn: '1h' },
			}),
		}),
	],
	providers: [AuthService, AuthGuard],
	controllers: [AuthController],
	exports: [AuthService],
})
export class AuthModule {}