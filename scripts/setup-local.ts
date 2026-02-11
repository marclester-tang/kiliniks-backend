
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const STACK_NAME = process.env.STACK_NAME || 'KiliniksBackendStack-Staging';
const PROFILE = process.env.AWS_PROFILE || 'kiliniks';

const runCommand = (command: string) => {
    try {
        console.log(`Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Failed to run command: ${command}`);
        process.exit(1);
    }
};

const main = async () => {
    console.log('--- Setting up Local Environment ---');

    // 1. Start Docker for DB
    console.log('\n--- Starting Database ---');
    runCommand('docker-compose up -d');
    
    // Wait for DB to be ready (simple delay for now, or could check port)
    console.log('Waiting for database to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 2. Run Migrations
    console.log('\n--- Running Migrations ---');
    // Ensure drizzle-kit is installed or use npx
    runCommand('npx drizzle-kit push');

    // 3. Fetch CloudFormation Outputs
    console.log(`\n--- Fetching Outputs from Stack: ${STACK_NAME} ---`);
    try {
        const output = execSync(
            `aws cloudformation describe-stacks --stack-name ${STACK_NAME} --profile ${PROFILE} --query "Stacks[0].Outputs" --output json`
        ).toString();

        const outputs = JSON.parse(output);
        
        const userPoolId = outputs.find((o: any) => o.OutputKey === 'UserPoolId')?.OutputValue;
        const clientId = outputs.find((o: any) => o.OutputKey === 'ClientId')?.OutputValue;
        
        if (!userPoolId || !clientId) {
            console.error('Could not find UserPoolId or ClientId in stack outputs.');
            console.log('Make sure the stack is deployed and the outputs exist.');
        } else {
             console.log(`Found UserPoolId: ${userPoolId}`);
             console.log(`Found ClientId: ${clientId}`);

             // 4. Update .env
             const envPath = path.join(__dirname, '../.env');
             let envContent = '';
             
             if (fs.existsSync(envPath)) {
                 envContent = fs.readFileSync(envPath, 'utf-8');
             }

             const updateEnvVar = (key: string, value: string) => {
                 const regex = new RegExp(`^${key}=.*`, 'm');
                 if (regex.test(envContent)) {
                     envContent = envContent.replace(regex, `${key}=${value}`);
                 } else {
                     envContent += `\n${key}=${value}`;
                 }
             };

             updateEnvVar('COGNITO_USER_POOL_ID', userPoolId);
             updateEnvVar('COGNITO_CLIENT_ID', clientId);
             // Verify DATABASE_URL for local dev
             if (!envContent.includes('DATABASE_URL=')) {
                  envContent += `\nDATABASE_URL=postgresql://postgres:password@localhost:5432/kiliniks`;
             }

             fs.writeFileSync(envPath, envContent.trim() + '\n');
             console.log(`\nUpdated .env file at ${envPath}`);
        }

    } catch (error) {
        console.error('Failed to fetch CloudFormation outputs. Make sure you are logged in successfully to AWS CLI.');
        console.error(error);
    }

    console.log('\n--- Setup Complete ---');
    console.log('You can now run: npm run start:local');
};

main();
