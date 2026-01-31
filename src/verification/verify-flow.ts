import { getDbPool } from '../utils/db';
import { PostgresFlowRepository } from '../adapters/secondary/postgres-flow-repo';
import { PostgresLocationRepository } from '../adapters/secondary/postgres-location-repo';
import { PostgresStageRepository } from '../adapters/secondary/postgres-stage-repo';
import { FlowService } from '../core/flow-service';
import { SalesItem } from '../core/types';

async function verify() {
    console.log('Starting Verification...');
    
    // Setup
    const pool = await getDbPool();
    const flowRepo = new PostgresFlowRepository(pool);
    const locationRepo = new PostgresLocationRepository(pool);
    const stageRepo = new PostgresStageRepository(pool);
    const service = new FlowService(flowRepo, locationRepo, stageRepo);

    const testUser = 'test-user-verification';

    try {
        // 1. Create Location
        console.log('\n--- Creating Location ---');
        const location = await service.createLocation({
            name: 'Verification Location',
            description: 'Created by verify script',
            createdBy: testUser,
            updatedBy: testUser
        });
        console.log('Location Created:', location.id);

        // 2. Create Flow
        console.log('\n--- Creating Flow ---');
        const flow = await service.createFlow({
            name: 'Verification Flow',
            createdBy: testUser,
            updatedBy: testUser
        });
        console.log('Flow Created:', flow.id);

        // 3. Create Stage with Sales Items and Link to Location
        console.log('\n--- Creating Stage ---');
        const salesItem: Omit<SalesItem, 'id' | 'stageId'> = {
            name: 'Consultation Fee',
            itemType: 'Service',
            price: 50.00,
            defaultQuantity: 1,
            defaultPanelCategory: 'General',
            panelCategories: {}
        };

        const stage = await service.createStage({
            flowId: flow.id,
            name: 'Triage Stage',
            hasNotes: true,
            soundUrl: 'ding.mp3',
            salesItems: [salesItem],
            locationIds: [location.id],
            createdBy: testUser,
            updatedBy: testUser
        });
        console.log('Stage Created:', stage.id);

        // 4. Verification Reads
        console.log('\n--- Verifying Reads ---');
        const fetchedFlow = await service.getFlow(flow.id);
        console.log('Flow Fetched:', fetchedFlow?.name === 'Verification Flow' ? 'OK' : 'FAIL');

        const fetchedLocation = await service.getLocation(location.id);
        console.log('Location Fetched:', fetchedLocation?.name === 'Verification Location' ? 'OK' : 'FAIL');

        const fetchedStage = await service.getStage(stage.id);
        console.log('Stage Fetched:', fetchedStage?.name === 'Triage Stage' ? 'OK' : 'FAIL');
        console.log('Stage Sales Items:', fetchedStage?.salesItems?.length === 1 ? 'OK' : 'FAIL');
        console.log('Stage Locations:', fetchedStage?.locationIds?.length === 1 ? 'OK' : 'FAIL');

        // 5. Pagination Check
        console.log('\n--- Verifying Pagination ---');
        const flowsList = await service.listFlows({ limit: 1 });
        console.log('Flows List Limit 1:', flowsList.data.length === 1 ? 'OK' : 'FAIL');

        // 6. Cleanup
        console.log('\n--- Cleanup ---');
        if (fetchedStage) await service.deleteStage(fetchedStage.id);
        console.log('Stage Deleted');
        if (fetchedFlow) await service.deleteFlow(fetchedFlow.id);
        console.log('Flow Deleted');
        if (fetchedLocation) await service.deleteLocation(fetchedLocation.id);
        console.log('Location Deleted');

        console.log('\nVerification Complete!');

    } catch (e) {
        console.error('Verification Failed:', e);
    } finally {
        await pool.end();
    }
}

verify();
