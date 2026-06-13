import { Module, type DynamicModule, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER } from './storage.interface';
import { StorageService } from './storage.service';
import { R2StorageProvider } from './providers/r2-storage.provider';
import { CloudinaryProvider } from './providers/cloudinary.provider';
import { LocalStorageProvider } from './providers/local-storage.provider';

@Module({})
export class StorageModule {
  private static readonly logger = new Logger(StorageModule.name);

  /**
   * Dynamic module: reads STORAGE_PROVIDER env to select the concrete provider.
   * Usage: `StorageModule.register()` in AppModule imports.
   */
  static register(): DynamicModule {
    return {
      module: StorageModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: STORAGE_PROVIDER,
          useFactory: (config: ConfigService) => {
            const provider = config.get<string>('STORAGE_PROVIDER', 'local');

            StorageModule.logger.log(`Storage provider: ${provider}`);

            switch (provider) {
              case 'cloudinary':
                return new CloudinaryProvider(config);
              case 'r2':
                return new R2StorageProvider(config);
              case 'local':
              default:
                return new LocalStorageProvider(config);
            }
          },
          inject: [ConfigService],
        },
        StorageService,
      ],
      exports: [StorageService],
      global: true,
    };
  }
}
