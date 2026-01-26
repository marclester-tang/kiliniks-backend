import { Pool } from 'pg';
import { Appointment, AppointmentRepository } from '../../core/types';
import { v4 as uuidv4 } from 'uuid';

export class PostgresRepository implements AppointmentRepository {
    constructor(private pool: Pool) {}
    
    private mapRowToAppointment(row: any): Appointment {
        return {
            id: row.id,
            patientName: row.patient_name,
            doctorName: row.doctor_name,
            date: new Date(row.appointment_date).toISOString(), 
            status: row.status,
            notes: row.notes,
            createdBy: row.created_by,
        };
    }

    async create(data: Omit<Appointment, 'id'>): Promise<Appointment> {
        const id = uuidv4();
        const query = `
            INSERT INTO appointments (id, patient_name, doctor_name, appointment_date, status, notes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [id, data.patientName, data.doctorName, data.date, data.status, data.notes, data.createdBy];
        const res = await this.pool.query(query, values);
        return this.mapRowToAppointment(res.rows[0]);
    }

    async findById(id: string): Promise<Appointment | null> {
        const query = 'SELECT * FROM appointments WHERE id = $1';
        const res = await this.pool.query(query, [id]);
        if (res.rows.length === 0) return null;
        return this.mapRowToAppointment(res.rows[0]);
    }
    
    async findAll(): Promise<Appointment[]> {
        const query = 'SELECT * FROM appointments';
        const res = await this.pool.query(query);
        return res.rows.map(row => this.mapRowToAppointment(row));
    }
    
    async update(id: string, data: Partial<Appointment>): Promise<Appointment | null> {
        const updates: string[] = [];
        const values: any[] = [id];
        let idx = 2;
        
        if (data.patientName !== undefined) { updates.push(`patient_name = $${idx++}`); values.push(data.patientName); }
        if (data.doctorName !== undefined) { updates.push(`doctor_name = $${idx++}`); values.push(data.doctorName); }
        if (data.date !== undefined) { updates.push(`appointment_date = $${idx++}`); values.push(data.date); }
        if (data.status !== undefined) { updates.push(`status = $${idx++}`); values.push(data.status); }
        if (data.notes !== undefined) { updates.push(`notes = $${idx++}`); values.push(data.notes); }
        
        if (updates.length === 0) return this.findById(id);

        const query = `UPDATE appointments SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
        const res = await this.pool.query(query, values);
        if (res.rows.length === 0) return null;
        return this.mapRowToAppointment(res.rows[0]);
    }

    async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM appointments WHERE id = $1';
        const res = await this.pool.query(query, [id]);
        return (res.rowCount || 0) > 0;
    }
}
