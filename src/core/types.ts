export interface Appointment {
    id: string;
    patientName: string;
    doctorName: string;
    date: string; // ISO string
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    notes?: string;
    createdBy?: string;
}

export interface AppointmentRepository {
    create(data: Omit<Appointment, 'id'>): Promise<Appointment>;
    findById(id: string): Promise<Appointment | null>;
    update(id: string, data: Partial<Appointment>): Promise<Appointment | null>;
    delete(id: string): Promise<boolean>;
    findAll(): Promise<Appointment[]>;
}

export interface EventPublisher {
    publish(eventName: string, data: any): Promise<void>;
}
