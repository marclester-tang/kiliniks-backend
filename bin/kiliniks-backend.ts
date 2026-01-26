#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KiliniksBackendStack } from '../lib/kiliniks-backend-stack';

const app = new cdk.App();

// Use the environment implied by the CLI configuration
const env = { 
  account: process.env.CDK_DEFAULT_ACCOUNT, 
  region: process.env.CDK_DEFAULT_REGION 
};

const clinicCtx = app.node.tryGetContext('clinic');

if (clinicCtx) {
    // Clinic Specific Stacks
    const clinicName = clinicCtx as string;
    // Sanitize clinic name for stack name (remove special chars if needed)
    const sanitizedClinic = clinicName.replace(/[^a-zA-Z0-9]/g, '');

    new KiliniksBackendStack(app, `KiliniksBackendStack-${sanitizedClinic}-Staging`, {
        stage: 'staging',
        clinicName: sanitizedClinic,
        env,
    });

    new KiliniksBackendStack(app, `KiliniksBackendStack-${sanitizedClinic}-Prod`, {
        stage: 'prod',
        clinicName: sanitizedClinic,
        env,
    });
} else {
    // Default Stacks (Legacy/Shared)
    new KiliniksBackendStack(app, 'KiliniksBackendStack-Staging', {
        stage: 'staging',
        clinicName: 'default',
        env,
    });

    new KiliniksBackendStack(app, 'KiliniksBackendStack-Prod', {
        stage: 'prod',
        clinicName: 'default',
        env,
    });
}
