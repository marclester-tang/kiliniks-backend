import { AppointmentService } from '../src/core/appointment-service';
import { AppointmentRepository, EventPublisher } from '../src/core/types';

describe('AppointmentService', () => {
    let service: AppointmentService;
    let mockRepo: jest.Mocked<AppointmentRepository>;
    let mockPublisher: jest.Mocked<EventPublisher>;

    beforeEach(() => {
        mockRepo = {
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findAll: jest.fn(),
        } as any;
        mockPublisher = {
            publish: jest.fn(),
        } as any;
        service = new AppointmentService(mockRepo, mockPublisher);
    });

    test('should create appointment and publish event', async () => {
        const data = { patientName: 'John', doctorName: 'Dr. Smith', date: '2023-10-10', notes: 'Test' };
        const created = { 
            id: '123', 
            ...data, 
            status: 'SCHEDULED', 
        } as any;
        
        mockRepo.create.mockResolvedValue(created);

        const result = await service.createAppointment(data);

        expect(result).toEqual(created);
        expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'SCHEDULED' }));
        expect(mockPublisher.publish).toHaveBeenCalledWith('AppointmentCreated', created);
    });
});
