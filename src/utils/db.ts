import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Pool } from 'pg';

let pool: Pool;

export const getDbPool = async () => {
    if (pool) return pool;

    const secretArn = process.env.DB_SECRET_ARN;
    
    if (secretArn) {
        // AWS Mode
        try {
            const client = new SecretsManagerClient({});
            const response = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
            if (!response.SecretString) {
                throw new Error("SecretString is empty");
            }
            const secret = JSON.parse(response.SecretString);
            
            pool = new Pool({
                host: secret.host,
                user: secret.username,
                password: secret.password,
                database: process.env.DB_NAME || secret.dbname || 'kiliniks',
                port: secret.port || 5432,
                ssl: { rejectUnauthorized: false }
            });
            console.log('Connected to RDS via Secrets Manager');
        } catch (err) {
            console.error('Failed to connect to RDS', err);
            throw err;
        }
    } else {
        // Local Mode
        console.log('Connecting to Local DB via DATABASE_URL');
        pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/kiliniks'
        });
    }
    return pool;
};
