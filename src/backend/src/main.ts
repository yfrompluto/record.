// =====================================================================
//		The application;s entrypoint.
//		It initialises the NestJS server, configures global middlewares
//		(cookie parsing, request validation..) and starts the application
//		by listening for incoming requests on the configured port.
// =====================================================================
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser = require('cookie-parser');
import { PrismaClient } from '@prisma/client';

/**
 *  	Validation pipe:
 * 		- whitelist; strip undeclared properties (DTO) for security
 * 		- forbidNonWhitelisted; send 400 for body errors
 * 		- transForm; translates JSON body to a DTO instance
 */
async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.use(cookieParser());

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

	const prisma = app.get(PrismaClient);
	app.enableShutdownHooks();

	process.on('beforeExit', async () => {
		await app.close();
});

	await app.listen(3000);
}
bootstrap();