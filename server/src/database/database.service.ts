import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ConfigService } from "@nestjs/config";
import { PG_POOL } from "./database.constants";
import * as schema from "./schema";

export type DbType = NodePgDatabase<typeof schema>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public readonly db: DbType;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleInit(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();
      this.logger.log("Connected to PostgreSQL (Drizzle)");
    } catch (error) {
      this.logger.error("Failed to connect to PostgreSQL", error as Error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log("Disconnected from PostgreSQL");
  }
}
