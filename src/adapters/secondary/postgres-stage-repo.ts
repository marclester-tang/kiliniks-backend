import { Stage, StageRepository, SalesItem } from '../../core/types';
import { getDb } from './database';
import { stages, salesItems, stageLocations } from './schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export class PostgresStageRepository implements StageRepository {
    private db: NodePgDatabase<typeof schema>;

    constructor(pool?: Pool) {
        this.db = getDb(pool);
    } // End of constructor

    private mapDrizzleStageToStage(row: typeof stages.$inferSelect, items: SalesItem[] = [], locIds: string[] = []): Stage {
        return {
            id: row.id,
            flowId: row.flowId,
            name: row.name,
            hasNotes: row.hasNotes ?? false,
            soundUrl: row.soundUrl ?? undefined,
            salesItems: items,
            locationIds: locIds,
            createdBy: row.createdBy ?? 'unknown',
            updatedBy: row.updatedBy ?? undefined,
            createdAt: row.createdAt.toISOString(),
        };
    }

    private mapDrizzleItemToSalesItem(row: typeof salesItems.$inferSelect): SalesItem {
        return {
            id: row.id,
            stageId: row.stageId ?? '', // Handle potential null stageId if necessary, though it should be linked
            name: row.name,
            itemType: row.itemType ?? undefined,
            price: parseFloat(row.price),
            costPrice: row.costPrice ? parseFloat(row.costPrice) : undefined,
            defaultQuantity: row.defaultQuantity,
            defaultPanelCategory: row.defaultPanelCategory ?? undefined,
            panelCategories: row.panelCategories as any,
        };
    }

    async create(data: Omit<Stage, 'id' | 'createdAt' | 'salesItems' | 'locationIds'> & { salesItems?: Omit<SalesItem, 'id' | 'stageId'>[], locationIds?: string[] }): Promise<Stage> {
        return await this.db.transaction(async (tx) => {
            const newId = uuidv4();
            
            const [insertedStage] = await tx.insert(stages).values({
                id: newId,
                flowId: data.flowId,
                name: data.name,
                hasNotes: data.hasNotes,
                soundUrl: data.soundUrl,
                createdBy: data.createdBy,
                updatedBy: data.updatedBy,
            }).returning();

            const createdSalesItems: SalesItem[] = [];
            if (data.salesItems && data.salesItems.length > 0) {
                 const itemsToInsert = data.salesItems.map(item => ({
                    id: uuidv4(),
                    stageId: newId,
                    name: item.name,
                    itemType: item.itemType, // Now compatible if schema is nullable
                    price: item.price.toString(),
                    costPrice: item.costPrice?.toString(),
                    defaultQuantity: item.defaultQuantity,
                    defaultPanelCategory: item.defaultPanelCategory,
                    panelCategories: item.panelCategories,
                 }));

                 const insertedItems = await tx.insert(salesItems).values(itemsToInsert).returning();
                 createdSalesItems.push(...insertedItems.map(this.mapDrizzleItemToSalesItem));
            }

            if (data.locationIds && data.locationIds.length > 0) {
                await tx.insert(stageLocations).values(
                    data.locationIds.map(locId => ({
                        stageId: newId,
                        locationId: locId
                    }))
                );
            }

            return this.mapDrizzleStageToStage(insertedStage, createdSalesItems, data.locationIds || []);
        });
    }

    async update(id: string, data: Partial<Stage>): Promise<Stage | null> {
         return await this.db.transaction(async (tx) => {
            const [existing] = await tx.select().from(stages).where(eq(stages.id, id));
            if (!existing) return null;

            const { createdAt, ...updateData } = data;
            
            const [updatedStage] = await tx.update(stages)
                .set({
                    ...updateData,
                    updatedAt: new Date(),
                })
                .where(eq(stages.id, id))
                .returning();

            // Handle Sales Items
            let currentSalesItems: SalesItem[] = [];
            if (data.salesItems !== undefined) {
                await tx.delete(salesItems).where(eq(salesItems.stageId, id));
                if (data.salesItems.length > 0) {
                    const itemsToInsert = data.salesItems.map(item => ({
                        id: item.id || uuidv4(),
                        stageId: id,
                        name: item.name,
                        itemType: item.itemType,
                        price: item.price.toString(),
                        costPrice: item.costPrice?.toString(),
                        defaultQuantity: item.defaultQuantity,
                        defaultPanelCategory: item.defaultPanelCategory,
                        panelCategories: item.panelCategories,
                    }));
                    const insertedItems = await tx.insert(salesItems).values(itemsToInsert).returning();
                    currentSalesItems = insertedItems.map(this.mapDrizzleItemToSalesItem);
                }
            } else {
                 const existingItems = await tx.select().from(salesItems).where(eq(salesItems.stageId, id));
                 currentSalesItems = existingItems.map(this.mapDrizzleItemToSalesItem);
            }

            // Handle Locations
            let currentLocationIds: string[] = [];
            if (data.locationIds !== undefined) {
                 await tx.delete(stageLocations).where(eq(stageLocations.stageId, id));
                 if (data.locationIds.length > 0) {
                     await tx.insert(stageLocations).values(
                         data.locationIds.map(locId => ({
                             stageId: id,
                             locationId: locId
                         }))
                     );
                 }
                 currentLocationIds = data.locationIds;
            } else {
                 const existingLocs = await tx.select().from(stageLocations).where(eq(stageLocations.stageId, id));
                 currentLocationIds = existingLocs.map(l => l.locationId);
            }

            return this.mapDrizzleStageToStage(updatedStage, currentSalesItems, currentLocationIds);
        });
    }

    async findById(id: string): Promise<Stage | null> {
        const [stage] = await this.db.select().from(stages).where(eq(stages.id, id));
        if (!stage) return null;

        const items = await this.db.select().from(salesItems).where(eq(salesItems.stageId, id));
        const locs = await this.db.select().from(stageLocations).where(eq(stageLocations.stageId, id));

        return this.mapDrizzleStageToStage(
            stage, 
            items.map(this.mapDrizzleItemToSalesItem),
            locs.map(l => l.locationId)
        );
    }

    async findAllByFlowId(flowId: string): Promise<Stage[]> {
        const stageRows = await this.db.select().from(stages).where(eq(stages.flowId, flowId)); // ordering could be added
        
        const results: Stage[] = [];
        for (const row of stageRows) {
             const items = await this.db.select().from(salesItems).where(eq(salesItems.stageId, row.id));
             const locs = await this.db.select().from(stageLocations).where(eq(stageLocations.stageId, row.id));
             
             results.push(this.mapDrizzleStageToStage(
                 row,
                 items.map(this.mapDrizzleItemToSalesItem),
                 locs.map(l => l.locationId)
             ));
        }
        return results;
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.db.delete(stages).where(eq(stages.id, id)).returning();
        return result.length > 0;
    }
}


