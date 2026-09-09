// =====================================================================
//		This module provides and initialises the VaultService.
//		It loads application secrets asynchronously before dependent 
//		services  are created, ensuring a secure startup with creds.
// =====================================================================

import { Module } from '@nestjs/common';
import { VaultService } from './vault.service';

@Module({
  providers: [
    {
      provide: VaultService,
      useFactory: async (): Promise<VaultService> => {
        const service = new VaultService();
        await service.loadSecrets();
        return service;
      },
    },
  ],
  exports: [VaultService],
})
export class VaultModule {}