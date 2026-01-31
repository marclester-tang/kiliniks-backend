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

export interface PaginationParams {
    limit?: number;
    offset?: number;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
}

export interface Flow {
    id: string;
    name: string;
    createdBy: string;
    updatedBy?: string;
    createdAt: string;
}

export interface Location {
    id: string;
    name: string;
    description?: string;
    createdBy: string;
    updatedBy?: string;
    createdAt: string;
}

export interface SalesItem {
    id: string;
    stageId: string;
    name: string;
    itemType?: string;
    price: number;
    costPrice?: number;
    defaultQuantity: number;
    defaultPanelCategory?: string;
    panelCategories?: any; // JSON
}

export interface Stage {
    id: string;
    flowId: string;
    name: string;
    hasNotes: boolean;
    soundUrl?: string;
    salesItems?: SalesItem[];
    locationIds?: string[]; // IDs of locations linked to this stage
    createdBy: string;
    updatedBy?: string;
    createdAt: string;
}

export interface FlowRepository {
    create(data: Omit<Flow, 'id' | 'createdAt'>): Promise<Flow>;
    update(id: string, data: Partial<Flow>): Promise<Flow | null>;
    findById(id: string): Promise<Flow | null>;
    findAll(params?: PaginationParams): Promise<PaginatedResult<Flow>>;
    delete(id: string): Promise<boolean>;
}

export interface LocationRepository {
    create(data: Omit<Location, 'id' | 'createdAt'>): Promise<Location>;
    update(id: string, data: Partial<Location>): Promise<Location | null>;
    findById(id: string): Promise<Location | null>;
    findAll(params?: PaginationParams): Promise<PaginatedResult<Location>>;
    delete(id: string): Promise<boolean>;
}

export interface StageRepository {
    create(data: Omit<Stage, 'id' | 'createdAt' | 'salesItems' | 'locationIds'> & { salesItems?: Omit<SalesItem, 'id' | 'stageId'>[], locationIds?: string[] }): Promise<Stage>;
    update(id: string, data: Partial<Stage>): Promise<Stage | null>;
    findById(id: string): Promise<Stage | null>;
    findAllByFlowId(flowId: string): Promise<Stage[]>;
    delete(id: string): Promise<boolean>;
}
