import { Appointment, AppointmentRepository, EventPublisher } from './types';

export class AppointmentService {
    constructor(
        private repo: AppointmentRepository,
        private publisher: EventPublisher
    ) {}

    async createAppointment(data: Omit<Appointment, 'id' | 'status'>) {
        const appointment = await this.repo.create({ ...data, status: 'SCHEDULED' });
        await this.publisher.publish('AppointmentCreated', appointment);
        return appointment;
    }

    async getAppointment(id: string) {
        const appointment = await this.repo.findById(id);
        if (!appointment) throw new Error('Appointment not found');
        return appointment;
    }

    async updateAppointment(id: string, data: Partial<Omit<Appointment, 'id'>>) {
        const appointment = await this.repo.update(id, data);
        if (!appointment) throw new Error('Appointment not found');
        await this.publisher.publish('AppointmentUpdated', appointment);
        return appointment;
    }

    async deleteAppointment(id: string) {
        const success = await this.repo.delete(id);
        if (!success) throw new Error('Appointment not found');
        await this.publisher.publish('AppointmentDeleted', { id });
        return success;
    }

    async listAppointments() {
        return this.repo.findAll();
    }
}
