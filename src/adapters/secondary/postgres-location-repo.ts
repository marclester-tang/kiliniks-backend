import { Pool } from 'pg';
import { Location, LocationRepository, PaginatedResult, PaginationParams } from '../../core/types';
import { v4 as uuidv4 } from 'uuid';

export class PostgresLocationRepository implements LocationRepository {
    constructor(private pool: Pool) {}

    private mapRowToLocation(row: any): Location {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            createdAt: new Date(row.created_at).toISOString(),
        };
    }

    async create(data: Omit<Location, 'id' | 'createdAt'>): Promise<Location> {
        const id = uuidv4();
        const query = `
            INSERT INTO locations (id, name, description, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [id, data.name, data.description, data.createdBy, data.updatedBy];
        const res = await this.pool.query(query, values);
        return this.mapRowToLocation(res.rows[0]);
    }

    async update(id: string, data: Partial<Location>): Promise<Location | null> {
        const updates: string[] = [];
        const values: any[] = [id];
        let idx = 2;

        if (data.name !== undefined) {
            updates.push(`name = $${idx++}`);
            values.push(data.name);
        }
        if (data.description !== undefined) {
            updates.push(`description = $${idx++}`);
            values.push(data.description);
        }
        if (data.updatedBy !== undefined) {
            updates.push(`updated_by = $${idx++}`);
            values.push(data.updatedBy);
        }

        updates.push(`updated_at = NOW()`);

        const query = `UPDATE locations SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
        const res = await this.pool.query(query, values);
        
        if (res.rows.length === 0) return null;
        return this.mapRowToLocation(res.rows[0]);
    }

    async findById(id: string): Promise<Location | null> {
        const query = 'SELECT * FROM locations WHERE id = $1';
        const res = await this.pool.query(query, [id]);
        if (res.rows.length === 0) return null;
        return this.mapRowToLocation(res.rows[0]);
    }

    async findAll(params?: PaginationParams): Promise<PaginatedResult<Location>> {
        const limit = params?.limit || 10;
        const offset = params?.offset || 0;

        const countQuery = 'SELECT COUNT(*) FROM locations';
        const countRes = await this.pool.query(countQuery);
        const total = parseInt(countRes.rows[0].count, 10);

        const query = 'SELECT * FROM locations LIMIT $1 OFFSET $2';
        const res = await this.pool.query(query, [limit, offset]);
        
        return {
            data: res.rows.map(row => this.mapRowToLocation(row)),
            total
        };
    }

    async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM locations WHERE id = $1';
        const res = await this.pool.query(query, [id]);
        return (res.rowCount || 0) > 0;
    }
}
