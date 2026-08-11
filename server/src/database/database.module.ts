import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { DatabaseService } from "./database.service";
import { PG_POOL } from "./database.constants";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("DATABASE_URL");
        if (!url) {
          throw new Error("DATABASE_URL is not configured");
        }
        return new Pool({
          connectionString: url,
          max: 10,
        });
      },
    },
    DatabaseService,
  ],
  exports: [DatabaseService, PG_POOL],
})
export class DatabaseModule {}
