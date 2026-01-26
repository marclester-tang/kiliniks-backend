# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

# Implementation Plan - Kiliniks Backend

## Goal Description
Create a serverless backend for Kiliniks using AWS CDK (TypeScript). The system will support Appointment CRUD, event-driven email notifications via SQS, and Cognito authentication. It will feature a Staging and Prod environment strategy and support localhost testing.

## User Review Required
> [!IMPORTANT]
> **Local Development Strategy**: To satisfy "testable through localhost", we will implement an Express.js wrapper around the core logic. This allows running the API locally on port 3000/8080. For the database, we recommend using a local Docker Postgres instance that mimics the RDS schema.
> **Authentication**: Locally, we will use a "Mock Auth" middleware or point to the Staging Cognito User Pool.
> **Deployment**: We will assume the AWS CLI profile `kiliniks` is correctly configured on your machine.

## Proposed Changes

### Infrastructure (CDK)
We will create a multi-stack setup in `lib/`.
#### [NEW] [kiliniks-infrastructure.ts](file:///Users/lester/Projects/kiliniks-backend/lib/kiliniks-infrastructure.ts)
- **VPC**: Create a VPC with private and public subnets.
- **RDS**: Postgres instance (migrating to Aurora Serverless v2 recommended for start-stop cost savings, or standard RDS).
- **Cognito**: User Pool with groups (Admin, Staff, Doctor, Patient). App Client.
- **EventBridge**: Custom bus `KiliniksEventBus`.
- **SQS**: `EmailQueue` subscribed to appointment events.

### Backend Code Structure (`src/`)
We will use a modular structure to separate Lambda handlers from business logic.

#### [NEW] [src/core/](file:///Users/lester/Projects/kiliniks-backend/src/core/)
- Entities and Use Cases for Appointments.
- Repository Interfaces.

#### [NEW] [src/adapters/](file:///Users/lester/Projects/kiliniks-backend/src/adapters/)
- **Primary**:
    - `lambda-api.ts`: Entry point for API Gateway.
    - `local-server.ts`: Express server for localhost.
- **Secondary**:
    - `postgres-repo.ts`: Implementation of Repository using `pg` or `kysely`/`typeorm`.
    - `event-bridge-publisher.ts`: Implementation to publish events.

### Appointment CRUD
- Create `createAppointment`, `getAppointment`, `updateAppointment`, `deleteAppointment`.
- On mutation, publish `AppointmentCreated`, `AppointmentUpdated`, `AppointmentDeleted` events.

### Event Processing
- **Email Worker**: A Lambda function triggered by the SQS `EmailQueue`.
- It will log the event (placeholder for sending email via SES).

## Verification Plan

### Automated Tests
- Unit tests for Core logic (Jest).
- CDK Nag or Snapshot tests for Infrastructure.

### Manual Verification
- **Local**: Run `npm run start:local`. trigger Create Appointment via Postman/Curl. Check Local DB.
- **Cloud**: Deploy `npm run cdk deploy -- --profile kiliniks`.
    - Login via Cognito (AWS Console or hosted UI).
    - Call API Gateway endpoint.
    - Check CloudWatch logs for Email Worker processing.

`npx cdk deploy --all --context clinic=demo --profile kiliniks`