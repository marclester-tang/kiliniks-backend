import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDbPool } from '../../utils/db';
import { PostgresRepository } from '../secondary/postgres-repo';
import { EventBridgePublisher } from '../secondary/event-bridge-publisher';
import { AppointmentService } from '../../core/appointment-service';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Event:', JSON.stringify(event, null, 2));

    const method = event.httpMethod;
    const path = event.resource; 
    const pathParameters = event.pathParameters || {};
    
    try {
        const pool = await getDbPool();
        const repo = new PostgresRepository(pool);
        const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || 'default');
        const service = new AppointmentService(repo, publisher);
        
        const claims = event.requestContext.authorizer?.claims || {};
        const createdBy = claims.sub || 'unknown';

        if (path === '/appointments') {
            if (method === 'POST') {
                const body = JSON.parse(event.body || '{}');
                const result = await service.createAppointment({ ...body, createdBy });
                return { 
                    statusCode: 201, 
                    body: JSON.stringify(result),
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                };
            } else if (method === 'GET') {
                const result = await service.listAppointments();
                return { 
                    statusCode: 200, 
                    body: JSON.stringify(result),
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                };
            }
        } else if (path === '/appointments/{id}') {
            const id = pathParameters.id!;
            if (method === 'GET') {
                const result = await service.getAppointment(id);
                return { 
                    statusCode: 200, 
                    body: JSON.stringify(result),
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                };
            } else if (method === 'PUT') {
                const body = JSON.parse(event.body || '{}');
                const result = await service.updateAppointment(id, body);
                return { 
                    statusCode: 200, 
                    body: JSON.stringify(result),
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                };
            } else if (method === 'DELETE') {
                const result = await service.deleteAppointment(id);
                return { 
                    statusCode: 200, 
                    body: JSON.stringify({ success: result }),
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                };
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
