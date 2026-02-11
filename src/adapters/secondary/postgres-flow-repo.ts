import { Pool } from 'pg';
import { Flow, FlowRepository, PaginatedResult, PaginationParams } from '../../core/types';
import { getDb } from './database';
import { flows } from './schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export class PostgresFlowRepository implements FlowRepository {
    private db: NodePgDatabase<typeof schema>;

    constructor(pool?: Pool) {
        this.db = getDb(pool);
    }

    private mapDrizzleToFlow(row: typeof flows.$inferSelect): Flow {
        return {
            id: row.id,
            name: row.name,
            createdBy: row.createdBy,
            updatedBy: row.updatedBy ?? undefined,
            createdAt: row.createdAt.toISOString(),
        };
    }

    async create(data: Omit<Flow, 'id' | 'createdAt'>): Promise<Flow> {
        const id = uuidv4();
        const [inserted] = await this.db.insert(flows).values({
            id,
            name: data.name,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy,
        }).returning();
        
        return this.mapDrizzleToFlow(inserted);
    }

    async update(id: string, data: Partial<Flow>): Promise<Flow | null> {
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;
        
        updateData.updatedAt = new Date();

        const [updated] = await this.db.update(flows)
            .set(updateData)
            .where(eq(flows.id, id))
            .returning();
        
        if (!updated) return null;
        return this.mapDrizzleToFlow(updated);
    }

    async findById(id: string): Promise<Flow | null> {
        const [result] = await this.db.select().from(flows).where(eq(flows.id, id));
        if (!result) return null;
        return this.mapDrizzleToFlow(result);
    }

    async findAll(params?: PaginationParams): Promise<PaginatedResult<Flow>> {
        const limit = params?.limit || 10;
        const offset = params?.offset || 0;

        const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(flows);
        const total = Number(count);

        const results = await this.db.select().from(flows).limit(limit).offset(offset);
        
        return {
            data: results.map(this.mapDrizzleToFlow),
            total
        };
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.db.delete(flows).where(eq(flows.id, id)).returning();
        return result.length > 0;
    }
}
