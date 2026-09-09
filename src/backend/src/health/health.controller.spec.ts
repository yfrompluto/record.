import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { VaultService } from '../vault/vault.service';

describe('HealthController', () => {
	let controller: HealthController;

	beforeEach(async () => {
	const module: TestingModule = await Test.createTestingModule({
		controllers: [HealthController],
		providers: [
		{
			provide: HealthCheckService,
			useValue: { check: jest.fn() },
		},
		{
			provide: VaultService,
			useValue: {
				getSecrets: jest.fn().mockReturnValue({
				postgresUser: 'test_user',
				postgresPassword: 'test_password',
				}),
			},
		},
		],
	}).compile();

	controller = module.get<HealthController>(HealthController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});