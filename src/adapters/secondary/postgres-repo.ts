import { Pool } from 'pg';
import { Appointment, AppointmentRepository } from '../../core/types';
import { getDb } from './database';
import { appointments } from './schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export class PostgresRepository implements AppointmentRepository {
    private db: NodePgDatabase<typeof schema>;

    constructor(pool?: Pool) {
        this.db = getDb(pool);
    }
    
    private mapDrizzleToAppointment(row: typeof appointments.$inferSelect): Appointment {
        return {
            id: row.id,
            patientName: row.patientName,
            doctorName: row.doctorName,
            date: row.date.toISOString(), 
            status: row.status as 'SCHEDULED' | 'COMPLETED' | 'CANCELLED',
            notes: row.notes ?? undefined,
            createdBy: row.createdBy ?? undefined,
        };
    }

    async create(data: Omit<Appointment, 'id'>): Promise<Appointment> {
        const id = uuidv4();
        const [inserted] = await this.db.insert(appointments).values({
            id,
            patientName: data.patientName,
            doctorName: data.doctorName,
            date: new Date(data.date),
            status: data.status,
            notes: data.notes,
            createdBy: data.createdBy,
        }).returning();
        
        return this.mapDrizzleToAppointment(inserted);
    }

    async findById(id: string): Promise<Appointment | null> {
        const [result] = await this.db.select().from(appointments).where(eq(appointments.id, id));
        if (!result) return null;
        return this.mapDrizzleToAppointment(result);
    }
    
    async findAll(): Promise<Appointment[]> {
        const results = await this.db.select().from(appointments);
        return results.map(this.mapDrizzleToAppointment);
    }
    
    async update(id: string, data: Partial<Appointment>): Promise<Appointment | null> {
        const updateData: any = {};
        if (data.patientName !== undefined) updateData.patientName = data.patientName;
        if (data.doctorName !== undefined) updateData.doctorName = data.doctorName;
        if (data.date !== undefined) updateData.date = new Date(data.date);
        if (data.status !== undefined) updateData.status = data.status;
        if (data.notes !== undefined) updateData.notes = data.notes;
        
        if (Object.keys(updateData).length === 0) return this.findById(id);

        const [updated] = await this.db.update(appointments)
            .set(updateData)
            .where(eq(appointments.id, id))
            .returning();
            
        if (!updated) return null;
        return this.mapDrizzleToAppointment(updated);
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.db.delete(appointments).where(eq(appointments.id, id)).returning();
        return result.length > 0;
    }
}
