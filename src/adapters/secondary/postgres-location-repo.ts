import { Pool } from 'pg';
import { Location, LocationRepository, PaginatedResult, PaginationParams } from '../../core/types';
import { getDb } from './database';
import { locations } from './schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export class PostgresLocationRepository implements LocationRepository {
    private db: NodePgDatabase<typeof schema>;

    constructor(pool?: Pool) {
        this.db = getDb(pool);
    }

    private mapDrizzleToLocation(row: typeof locations.$inferSelect): Location {
        return {
            id: row.id,
            name: row.name,
            description: row.description ?? undefined,
            createdBy: row.createdBy,
            updatedBy: row.updatedBy ?? undefined,
            createdAt: row.createdAt.toISOString(),
        };
    }

    async create(data: Omit<Location, 'id' | 'createdAt'>): Promise<Location> {
        const id = uuidv4();
        const [inserted] = await this.db.insert(locations).values({
            id,
            name: data.name,
            description: data.description,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy,
        }).returning();
        
        return this.mapDrizzleToLocation(inserted);
    }

    async update(id: string, data: Partial<Location>): Promise<Location | null> {
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;

        updateData.updatedAt = new Date();

        const [updated] = await this.db.update(locations)
            .set(updateData)
            .where(eq(locations.id, id))
            .returning();
        
        if (!updated) return null;
        return this.mapDrizzleToLocation(updated);
    }

    async findById(id: string): Promise<Location | null> {
        const [result] = await this.db.select().from(locations).where(eq(locations.id, id));
        if (!result) return null;
        return this.mapDrizzleToLocation(result);
    }

    async findAll(params?: PaginationParams): Promise<PaginatedResult<Location>> {
        const limit = params?.limit || 10;
        const offset = params?.offset || 0;

        const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(locations);
        const total = Number(count);

        const results = await this.db.select().from(locations).limit(limit).offset(offset);
        
        return {
            data: results.map(this.mapDrizzleToLocation),
            total
        };
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.db.delete(locations).where(eq(locations.id, id)).returning();
        return result.length > 0;
    }
}
