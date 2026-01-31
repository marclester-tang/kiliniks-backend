import { Pool } from 'pg';
import { Flow, FlowRepository, PaginatedResult, PaginationParams } from '../../core/types';
import { v4 as uuidv4 } from 'uuid';

export class PostgresFlowRepository implements FlowRepository {
    constructor(private pool: Pool) {}

    private mapRowToFlow(row: any): Flow {
        return {
            id: row.id,
            name: row.name,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            createdAt: new Date(row.created_at).toISOString(),
        };
    }

    async create(data: Omit<Flow, 'id' | 'createdAt'>): Promise<Flow> {
        const id = uuidv4();
        const query = `
            INSERT INTO flows (id, name, created_by, updated_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const values = [id, data.name, data.createdBy, data.updatedBy];
        const res = await this.pool.query(query, values);
        return this.mapRowToFlow(res.rows[0]);
    }

    async update(id: string, data: Partial<Flow>): Promise<Flow | null> {
        const updates: string[] = [];
        const values: any[] = [id];
        let idx = 2;

        if (data.name !== undefined) {
            updates.push(`name = $${idx++}`);
            values.push(data.name);
        }
        if (data.updatedBy !== undefined) {
            updates.push(`updated_by = $${idx++}`);
            values.push(data.updatedBy);
        }

        updates.push(`updated_at = NOW()`);

        if (updates.length <= 1) { // Only updated_at
             // If nothing to update, just return existing? Or proceed to update timestamp? 
             // Let's proceed to update timestamp.
        }

        const query = `UPDATE flows SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
        const res = await this.pool.query(query, values);
        
        if (res.rows.length === 0) return null;
        return this.mapRowToFlow(res.rows[0]);
    }

    async findById(id: string): Promise<Flow | null> {
        const query = 'SELECT * FROM flows WHERE id = $1';
        const res = await this.pool.query(query, [id]);
        if (res.rows.length === 0) return null;
        return this.mapRowToFlow(res.rows[0]);
    }

    async findAll(params?: PaginationParams): Promise<PaginatedResult<Flow>> {
        const limit = params?.limit || 10;
        const offset = params?.offset || 0;

        const countQuery = 'SELECT COUNT(*) FROM flows';
        const countRes = await this.pool.query(countQuery);
        const total = parseInt(countRes.rows[0].count, 10);

        const query = 'SELECT * FROM flows LIMIT $1 OFFSET $2';
        const res = await this.pool.query(query, [limit, offset]);
        
        return {
            data: res.rows.map(row => this.mapRowToFlow(row)),
            total
        };
    }

    async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM flows WHERE id = $1';
        const res = await this.pool.query(query, [id]);
        return (res.rowCount || 0) > 0;
    }
}
