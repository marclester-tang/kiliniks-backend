
import { getDbPool } from '../utils/db';
import { PostgresRepository } from '../adapters/secondary/postgres-repo';
import { AppointmentService } from '../core/appointment-service';
import { ConsolePublisher } from '../adapters/secondary/console-publisher';

async function verify() {
    console.log('Starting Appointment Verification...');
    
    // Setup
    const pool = await getDbPool();
    const repo = new PostgresRepository(pool);
    const publisher = new ConsolePublisher();
    const service = new AppointmentService(repo, publisher);

    const testUser = 'test-user-verification';

    try {
        // 1. Create Appointment
        console.log('\n--- Creating Appointment ---');
        const appointment = await service.createAppointment({
            patientName: 'Test Patient',
            doctorName: 'Dr. Verify',
            date: new Date().toISOString(),
            notes: 'Created by verify script',
            createdBy: testUser
        });
        console.log('Appointment Created:', appointment.id);

        // 2. Read Appointment
        console.log('\n--- Reading Appointment ---');
        const fetched = await service.getAppointment(appointment.id);
        console.log('Appointment Fetched:', fetched?.patientName === 'Test Patient' ? 'OK' : 'FAIL');

        // 3. Update Appointment
        console.log('\n--- Updating Appointment ---');
        const updated = await service.updateAppointment(appointment.id, {
            status: 'COMPLETED',
            notes: 'Updated by verify script'
        });
        console.log('Appointment Updated:', updated?.status === 'COMPLETED' ? 'OK' : 'FAIL');

        // 4. List Appointments
        console.log('\n--- Listing Appointments ---');
        const list = await service.listAppointments();
        console.log('Appointments List contains created:', list.some(a => a.id === appointment.id) ? 'OK' : 'FAIL');

        // 5. Delete Appointment
        console.log('\n--- Deleting Appointment ---');
        const deleted = await service.deleteAppointment(appointment.id);
        console.log('Appointment Deleted:', deleted ? 'OK' : 'FAIL');

        console.log('\nAppointment Verification Complete!');

    } catch (e) {
        console.error('Verification Failed:', e);
    } finally {
        await pool.end();
    }
}

verify();
