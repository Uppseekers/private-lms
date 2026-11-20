import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

declare global {
  var _postgresPool: Pool | undefined;
  var _drizzleDb: NodePgDatabase<typeof schema> | undefined;
}

export function isSqlConfigured(): boolean {
  return Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER);
}

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    const isServerless = Boolean(process.env.VERCEL);
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: isServerless ? 3 : 10,
      connectionTimeoutMillis: isServerless ? 4000 : 15000,
    });

    global._postgresPool.on('error', (_err) => {
      // Silently ignore idle SQL pool errors when SQL is not configured
    });
  }
  return global._postgresPool;
};

export function getDb(): NodePgDatabase<typeof schema> {
  if (!global._drizzleDb) {
    global._drizzleDb = drizzle(createPool(), { schema });
  }
  return global._drizzleDb;
}

// Lazy proxy so importing `db` in Firestore-only / Vercel serverless mode never instantiates a PG pool
export const db: NodePgDatabase<typeof schema> = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const instance = getDb() as any;
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
