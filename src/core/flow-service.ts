import { 
    FlowRepository, LocationRepository, StageRepository, 
    Flow, Location, Stage, SalesItem, 
    PaginatedResult, PaginationParams 
} from './types';

export class FlowService {
    constructor(
        private flowRepo: FlowRepository,
        private locationRepo: LocationRepository,
        private stageRepo: StageRepository
    ) {}

    // Flows
    async createFlow(data: Omit<Flow, 'id' | 'createdAt'>): Promise<Flow> {
        return this.flowRepo.create(data);
    }

    async getFlow(id: string): Promise<Flow | null> {
        return this.flowRepo.findById(id);
    }

    async updateFlow(id: string, data: Partial<Flow>): Promise<Flow | null> {
        return this.flowRepo.update(id, data);
    }

    async listFlows(params?: PaginationParams): Promise<PaginatedResult<Flow>> {
        return this.flowRepo.findAll(params);
    }

    async deleteFlow(id: string): Promise<boolean> {
        return this.flowRepo.delete(id);
    }

    // Locations
    async createLocation(data: Omit<Location, 'id' | 'createdAt'>): Promise<Location> {
        return this.locationRepo.create(data);
    }

    async getLocation(id: string): Promise<Location | null> {
        return this.locationRepo.findById(id);
    }

    async updateLocation(id: string, data: Partial<Location>): Promise<Location | null> {
        return this.locationRepo.update(id, data);
    }

    async listLocations(params?: PaginationParams): Promise<PaginatedResult<Location>> {
        return this.locationRepo.findAll(params);
    }

    async deleteLocation(id: string): Promise<boolean> {
        return this.locationRepo.delete(id);
    }

    // Stages
    async createStage(data: Omit<Stage, 'id' | 'createdAt' | 'salesItems' | 'locationIds'> & { salesItems?: Omit<SalesItem, 'id' | 'stageId'>[], locationIds?: string[] }): Promise<Stage> {
        return this.stageRepo.create(data);
    }

    async getStage(id: string): Promise<Stage | null> {
        return this.stageRepo.findById(id);
    }

    async updateStage(id: string, data: Partial<Stage>): Promise<Stage | null> {
        return this.stageRepo.update(id, data);
    }

    async listStagesByFlow(flowId: string): Promise<Stage[]> {
        return this.stageRepo.findAllByFlowId(flowId);
    }

    async deleteStage(id: string): Promise<boolean> {
        return this.stageRepo.delete(id);
    }
}
