
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

// Cache the pool to reuse connections across invocations (lambda best practice)
let pool: Pool;

export const getDb = (providedPool?: Pool) => {
    if (providedPool) {
        return drizzle(providedPool, { schema });
    }
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/kiliniks',
        });
    }
    return drizzle(pool, { schema });
};
