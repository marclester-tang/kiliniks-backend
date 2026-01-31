import { Pool, PoolClient } from 'pg';
import { Stage, StageRepository, SalesItem } from '../../core/types';
import { v4 as uuidv4 } from 'uuid';

export class PostgresStageRepository implements StageRepository {
    constructor(private pool: Pool) {}

    private mapRowToStage(row: any, salesItems: SalesItem[] = [], locationIds: string[] = []): Stage {
        return {
            id: row.id,
            flowId: row.flow_id,
            name: row.name,
            hasNotes: row.has_notes,
            soundUrl: row.sound_url,
            salesItems: salesItems,
            locationIds: locationIds,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            createdAt: new Date(row.created_at).toISOString(),
        };
    }

    private mapRowToSalesItem(row: any): SalesItem {
        return {
            id: row.id,
            stageId: row.stage_id,
            name: row.name,
            itemType: row.item_type,
            price: parseFloat(row.price),
            costPrice: row.cost_price ? parseFloat(row.cost_price) : undefined,
            defaultQuantity: row.default_quantity,
            defaultPanelCategory: row.default_panel_category,
            panelCategories: row.panel_categories,
        };
    }

    async create(data: Omit<Stage, 'id' | 'createdAt' | 'salesItems' | 'locationIds'> & { salesItems?: Omit<SalesItem, 'id' | 'stageId'>[], locationIds?: string[] }): Promise<Stage> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const id = uuidv4();
            
            // Insert Stage
            const query = `
                INSERT INTO stages (id, flow_id, name, has_notes, sound_url, created_by, updated_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            const values = [id, data.flowId, data.name, data.hasNotes, data.soundUrl, data.createdBy, data.updatedBy];
            const res = await client.query(query, values);
            const stageRow = res.rows[0];

            // Insert Sales Items
            const salesItems: SalesItem[] = [];
            if (data.salesItems && data.salesItems.length > 0) {
                for (const item of data.salesItems) {
                    const itemId = uuidv4();
                    const itemQuery = `
                        INSERT INTO sales_items (id, stage_id, name, item_type, price, cost_price, default_quantity, default_panel_category, panel_categories)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        RETURNING *
                    `;
                    const itemValues = [
                        itemId, id, item.name, item.itemType, item.price, item.costPrice, 
                        item.defaultQuantity, item.defaultPanelCategory, JSON.stringify(item.panelCategories)
                    ];
                    const itemRes = await client.query(itemQuery, itemValues);
                    salesItems.push(this.mapRowToSalesItem(itemRes.rows[0]));
                }
            }

            // Insert Location Links
            if (data.locationIds && data.locationIds.length > 0) {
                for (const locId of data.locationIds) {
                    const locQuery = `INSERT INTO stage_locations (stage_id, location_id) VALUES ($1, $2)`;
                    await client.query(locQuery, [id, locId]);
                }
            }

            await client.query('COMMIT');
            return this.mapRowToStage(stageRow, salesItems, data.locationIds);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async update(id: string, data: Partial<Stage>): Promise<Stage | null> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const updates: string[] = [];
            const values: any[] = [id];
            let idx = 2;

            if (data.name !== undefined) { updates.push(`name = $${idx++}`); values.push(data.name); }
            if (data.hasNotes !== undefined) { updates.push(`has_notes = $${idx++}`); values.push(data.hasNotes); }
            if (data.soundUrl !== undefined) { updates.push(`sound_url = $${idx++}`); values.push(data.soundUrl); }
            if (data.updatedBy !== undefined) { updates.push(`updated_by = $${idx++}`); values.push(data.updatedBy); }
            
            updates.push(`updated_at = NOW()`);

            const query = `UPDATE stages SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
            const res = await client.query(query, values);
            
            if (res.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }
            const stageRow = res.rows[0];

            // Update Sales Items (Simpler to delete all and recreate for now, or sophisticated diff? 
            // For simplicity in this implementation, we will delete all and recreate if salesItems is provided)
            let salesItems: SalesItem[] = [];
            if (data.salesItems !== undefined) {
                await client.query('DELETE FROM sales_items WHERE stage_id = $1', [id]);
                for (const item of data.salesItems) {
                     const itemId = item.id || uuidv4(); // Use existing ID if provided (though type suggests it might be Partial? Check types.)
                     // The interface says `salesItems?: SalesItem[]` in Stage, which includes ID. 
                     // But strictly speaking, if we are replacing, we might generate new IDs or keep old ones. 
                     // Let's assume re-insertion for now.
                     const itemQuery = `
                        INSERT INTO sales_items (id, stage_id, name, item_type, price, cost_price, default_quantity, default_panel_category, panel_categories)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        RETURNING *
                    `;
                    const itemValues = [
                        uuidv4(), id, item.name, item.itemType, item.price, item.costPrice, 
                        item.defaultQuantity, item.defaultPanelCategory, JSON.stringify(item.panelCategories)
                    ];
                     const itemRes = await client.query(itemQuery, itemValues);
                     salesItems.push(this.mapRowToSalesItem(itemRes.rows[0]));
                }
            } else {
                // Fetch existing
                const existingItemsRes = await client.query('SELECT * FROM sales_items WHERE stage_id = $1', [id]);
                salesItems = existingItemsRes.rows.map(row => this.mapRowToSalesItem(row));
            }

            // Update Locations
            let locationIds: string[] = [];
            if (data.locationIds !== undefined) {
                await client.query('DELETE FROM stage_locations WHERE stage_id = $1', [id]);
                for (const locId of data.locationIds) {
                    await client.query('INSERT INTO stage_locations (stage_id, location_id) VALUES ($1, $2)', [id, locId]);
                }
                locationIds = data.locationIds;
            } else {
                 const existingLocsRes = await client.query('SELECT location_id FROM stage_locations WHERE stage_id = $1', [id]);
                 locationIds = existingLocsRes.rows.map(r => r.location_id);
            }

            await client.query('COMMIT');
            return this.mapRowToStage(stageRow, salesItems, locationIds);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async findById(id: string): Promise<Stage | null> {
        const query = 'SELECT * FROM stages WHERE id = $1';
        const res = await this.pool.query(query, [id]);
        if (res.rows.length === 0) return null;
        
        const stageRow = res.rows[0];

        const salesItemsRes = await this.pool.query('SELECT * FROM sales_items WHERE stage_id = $1', [id]);
        const salesItems = salesItemsRes.rows.map(row => this.mapRowToSalesItem(row));

        const locationsRes = await this.pool.query('SELECT location_id FROM stage_locations WHERE stage_id = $1', [id]);
        const locationIds = locationsRes.rows.map(row => row.location_id);

        return this.mapRowToStage(stageRow, salesItems, locationIds);
    }

    async findAllByFlowId(flowId: string): Promise<Stage[]> {
        const query = 'SELECT * FROM stages WHERE flow_id = $1 ORDER BY created_at ASC'; // Ordering by creation? Or add sequence?
        const res = await this.pool.query(query, [flowId]);
        
        const stages: Stage[] = [];
        for (const row of res.rows) {
            const salesItemsRes = await this.pool.query('SELECT * FROM sales_items WHERE stage_id = $1', [row.id]);
            const salesItems = salesItemsRes.rows.map(r => this.mapRowToSalesItem(r));

            const locationsRes = await this.pool.query('SELECT location_id FROM stage_locations WHERE stage_id = $1', [row.id]);
            const locationIds = locationsRes.rows.map(r => r.location_id);
            
            stages.push(this.mapRowToStage(row, salesItems, locationIds));
        }
        return stages;
    }

    async delete(id: string): Promise<boolean> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Delete children first (cascading usually handles this, but explicit is safer without foreign keys setup knowledge)
            await client.query('DELETE FROM sales_items WHERE stage_id = $1', [id]);
            await client.query('DELETE FROM stage_locations WHERE stage_id = $1', [id]);
            const res = await client.query('DELETE FROM stages WHERE id = $1', [id]);
            await client.query('COMMIT');
            return (res.rowCount || 0) > 0;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}
