import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDbPool } from '../../utils/db';
import { PostgresRepository } from '../secondary/postgres-repo';
import { PostgresFlowRepository } from '../secondary/postgres-flow-repo';
import { PostgresLocationRepository } from '../secondary/postgres-location-repo';
import { PostgresStageRepository } from '../secondary/postgres-stage-repo';
import { EventBridgePublisher } from '../secondary/event-bridge-publisher';
import { AppointmentService } from '../../core/appointment-service';
import { FlowService } from '../../core/flow-service';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Event:', JSON.stringify(event, null, 2));

    const method = event.httpMethod;
    const path = event.resource; 
    const pathParameters = event.pathParameters || {};
    const queryParameters = event.queryStringParameters || {};
    
    try {
        const pool = await getDbPool();
        const repo = new PostgresRepository(pool);
        const flowRepo = new PostgresFlowRepository(pool);
        const locationRepo = new PostgresLocationRepository(pool);
        const stageRepo = new PostgresStageRepository(pool);

        const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || 'default');
        const service = new AppointmentService(repo, publisher);
        const flowService = new FlowService(flowRepo, locationRepo, stageRepo);
        
        const claims = event.requestContext.authorizer?.claims || {};
        const createdBy = claims.sub || 'unknown';

        const jsonBody = JSON.parse(event.body || '{}');

        // Helper for response
        const response = (statusCode: number, body: any) => ({
            statusCode,
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

        // Appointments
        if (path === '/appointments') {
            if (method === 'POST') {
                const result = await service.createAppointment({ ...jsonBody, createdBy });
                return response(201, result);
            } else if (method === 'GET') {
                const result = await service.listAppointments();
                return response(200, result);
            }
        } else if (path === '/appointments/{id}') {
            const id = pathParameters.id!;
            if (method === 'GET') {
                const result = await service.getAppointment(id);
                return response(200, result);
            } else if (method === 'PUT') {
                const result = await service.updateAppointment(id, jsonBody);
                return response(200, result);
            } else if (method === 'DELETE') {
                const result = await service.deleteAppointment(id);
                return response(200, { success: result });
            }
        }

        // Flows
        else if (path === '/flows') {
            if (method === 'POST') {
                const result = await flowService.createFlow({ ...jsonBody, createdBy, updatedBy: createdBy });
                return response(201, result);
            } else if (method === 'GET') {
                const limit = queryParameters.limit ? parseInt(queryParameters.limit) : undefined;
                const offset = queryParameters.offset ? parseInt(queryParameters.offset) : undefined;
                const result = await flowService.listFlows({ limit, offset });
                return response(200, result);
            }
        } else if (path === '/flows/{id}') {
            const id = pathParameters.id!;
            if (method === 'GET') {
                const result = await flowService.getFlow(id);
                return response(200, result);
            } else if (method === 'PUT') {
                const result = await flowService.updateFlow(id, { ...jsonBody, updatedBy: createdBy });
                return response(200, result);
            } else if (method === 'DELETE') {
                const result = await flowService.deleteFlow(id);
                return response(200, { success: result });
            }
        } else if (path === '/flows/{id}/stages') {
             const id = pathParameters.id!;
             if (method === 'GET') {
                 const result = await flowService.listStagesByFlow(id);
                 return response(200, result);
             }
        }

        // Locations
        else if (path === '/locations') {
            if (method === 'POST') {
                const result = await flowService.createLocation({ ...jsonBody, createdBy, updatedBy: createdBy });
                return response(201, result);
            } else if (method === 'GET') {
                const limit = queryParameters.limit ? parseInt(queryParameters.limit) : undefined;
                const offset = queryParameters.offset ? parseInt(queryParameters.offset) : undefined;
                const result = await flowService.listLocations({ limit, offset });
                return response(200, result);
            }
        } else if (path === '/locations/{id}') {
            const id = pathParameters.id!;
            if (method === 'GET') {
                const result = await flowService.getLocation(id);
                return response(200, result);
            } else if (method === 'PUT') {
                const result = await flowService.updateLocation(id, { ...jsonBody, updatedBy: createdBy });
                return response(200, result);
            } else if (method === 'DELETE') {
                const result = await flowService.deleteLocation(id);
                return response(200, { success: result });
            }
        }

        // Stages
        else if (path === '/stages') {
            if (method === 'POST') {
                const result = await flowService.createStage({ ...jsonBody, createdBy, updatedBy: createdBy });
                return response(201, result);
            }
        } else if (path === '/stages/{id}') {
            const id = pathParameters.id!;
            if (method === 'GET') {
                const result = await flowService.getStage(id);
                return response(200, result);
            } else if (method === 'PUT') {
                const result = await flowService.updateStage(id, { ...jsonBody, updatedBy: createdBy });
                return response(200, result);
            } else if (method === 'DELETE') {
                const result = await flowService.deleteStage(id);
                return response(200, { success: result });
            }
        }

    } catch (error: any) {
        console.error(error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }
    
    return { 
        statusCode: 404, 
        body: JSON.stringify({ message: 'Not Found' }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    };
};
