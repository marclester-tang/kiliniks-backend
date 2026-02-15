import express from 'express';
import { getDbPool } from '../../utils/db';
import { PostgresRepository } from '../secondary/postgres-repo';
import { ConsolePublisher } from '../secondary/console-publisher';
import { AppointmentService } from '../../core/appointment-service';
import { FlowService } from '../../core/flow-service';
import { PostgresFlowRepository } from '../secondary/postgres-flow-repo';
import { PostgresLocationRepository } from '../secondary/postgres-location-repo';
import { PostgresStageRepository } from '../secondary/postgres-stage-repo';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import * as dotenv from 'dotenv';
import { authMiddleware } from './auth-middleware';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3000;

const startServer = async () => {
    const pool = await getDbPool();
    const repo = new PostgresRepository(pool);
    const flowRepo = new PostgresFlowRepository(pool);
    const locationRepo = new PostgresLocationRepository(pool);
    const stageRepo = new PostgresStageRepository(pool);
    
    const publisher = new ConsolePublisher();
    const service = new AppointmentService(repo, publisher);
    const flowService = new FlowService(flowRepo, locationRepo, stageRepo);

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Apply Auth Middleware
    app.use(authMiddleware);

    /**
     * @swagger
     * components:
     *   schemas:
     *     Appointment:
     *       type: object
     *       required:
     *         - patientName
     *         - doctorName
     *         - date
     *       properties:
     *         id:
     *           type: string
     *           description: The auto-generated id of the appointment
     *         patientName:
     *           type: string
     *           description: The name of the patient
     *         doctorName:
     *           type: string
     *           description: The name of the doctor
     *         date:
     *           type: string
     *           format: date-time
     *           description: The date of the appointment
     *         status:
     *           type: string
     *           enum: [SCHEDULED, COMPLETED, CANCELLED]
     *           description: The status of the appointment
     *         notes:
     *           type: string
     *           description: Additional notes
     *         createdBy:
     *           type: string
     *           description: The user who created the appointment
     *     Flow:
     *       type: object
     *       required:
     *         - name
     *       properties:
     *         id:
     *           type: string
     *         name:
     *           type: string
     *         createdBy:
     *           type: string
     *         updatedBy:
     *           type: string
     *         createdAt:
     *           type: string
     *           format: date-time
     *     Location:
     *       type: object
     *       required:
     *         - name
     *       properties:
     *         id:
     *           type: string
     *         name:
     *           type: string
     *         description:
     *           type: string
     *         createdBy:
     *           type: string
     *         updatedBy:
     *           type: string
     *         createdAt:
     *           type: string
     *           format: date-time
     *     SalesItem:
     *       type: object
     *       required:
     *         - name
     *         - price
     *         - defaultQuantity
     *       properties:
     *         id:
     *           type: string
     *         stageId:
     *           type: string
     *         name:
     *           type: string
     *         itemType:
     *           type: string
     *         price:
     *           type: number
     *         costPrice:
     *           type: number
     *         defaultQuantity:
     *           type: number
     *         defaultPanelCategory:
     *           type: string
     *         panelCategories:
     *           type: object
     *     Stage:
     *       type: object
     *       required:
     *         - flowId
     *         - name
     *       properties:
     *         id:
     *           type: string
     *         flowId:
     *           type: string
     *         name:
     *           type: string
     *         hasNotes:
     *           type: boolean
     *         soundUrl:
     *           type: string
     *         salesItems:
     *           type: array
     *           items:
     *             $ref: '#/components/schemas/SalesItem'
     *         locationIds:
     *           type: array
     *           items:
     *             type: string
     *         createdBy:
     *           type: string
     *         updatedBy:
     *           type: string
     *         createdAt:
     *           type: string
     *           format: date-time
     *   securitySchemes:
     *     BearerAuth:
     *       type: http
     *       scheme: bearer
     *       bearerFormat: JWT
     * security:
     *   - BearerAuth: []
     */

    /**
     * @swagger
     * /appointments:
     *   post:
     *     summary: Create a new appointment
     *     tags: [Appointments]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Appointment'
     *     responses:
     *       201:
     *         description: The created appointment
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Appointment'
     *       500:
     *         description: Server error
     */
    app.post('/appointments', async (req, res) => {
        try {
            const body = req.body;
            const createdBy = req.user?.sub || 'unknown';
            const result = await service.createAppointment({ ...body, createdBy });
            res.status(201).json(result);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /appointments:
     *   get:
     *     summary: List all appointments
     *     tags: [Appointments]
     *     responses:
     *       200:
     *         description: A list of appointments
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Appointment'
     *       500:
     *         description: Server error
     */
    app.get('/appointments', async (req, res) => {
        try {
            const result = await service.listAppointments();
            res.status(200).json(result);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /appointments/{id}:
     *   get:
     *     summary: Get an appointment by ID
     *     tags: [Appointments]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The appointment ID
     *     responses:
     *       200:
     *         description: The appointment description by ID
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Appointment'
     *       500:
     *         description: Server error
     */
    app.get('/appointments/:id', async (req, res) => {
        try {
            const result = await service.getAppointment(req.params.id);
            res.status(200).json(result);
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /appointments/{id}:
     *   put:
     *     summary: Update an appointment by ID
     *     tags: [Appointments]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The appointment ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Appointment'
     *     responses:
     *       200:
     *         description: The updated appointment
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Appointment'
     *       500:
     *         description: Server error
     */
    app.put('/appointments/:id', async (req, res) => {
        try {
            const result = await service.updateAppointment(req.params.id, req.body);
            res.status(200).json(result);
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /appointments/{id}:
     *   delete:
     *     summary: Delete an appointment by ID
     *     tags: [Appointments]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The appointment ID
     *     responses:
     *       200:
     *         description: The appointment was deleted
     *       500:
     *         description: Server error
     */
    app.delete('/appointments/:id', async (req, res) => {
        try {
            const result = await service.deleteAppointment(req.params.id);
            res.status(200).json({ success: result });
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    // --- Flows ---

    /**
     * @swagger
     * /flows:
     *   post:
     *     summary: Create a new flow
     *     tags: [Flows]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Flow'
     *     responses:
     *       201:
     *         description: The created flow
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Flow'
     *       500:
     *         description: Server error
     */
    app.post('/flows', async (req, res) => {
        try {
            const body = req.body;
            const createdBy = req.user?.sub || 'unknown';
            const result = await flowService.createFlow({ ...body, createdBy, updatedBy: createdBy });
            res.status(201).json(result);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /flows:
     *   get:
     *     summary: List all flows
     *     tags: [Flows]
     *     parameters:
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *         description: Limit the number of results
     *       - in: query
     *         name: offset
     *         schema:
     *           type: integer
     *         description: Offset for pagination
     *     responses:
     *       200:
     *         description: A list of flows
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Flow'
     *                 total:
     *                   type: integer
     *       500:
     *         description: Server error
     */
    app.get('/flows', async (req, res) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
            const result = await flowService.listFlows({ limit, offset });
            res.status(200).json(result);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /flows/{id}:
     *   get:
     *     summary: Get a flow by ID
     *     tags: [Flows]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The flow ID
     *     responses:
     *       200:
     *         description: The flow description by ID
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Flow'
     *       500:
     *         description: Server error
     */
    app.get('/flows/:id', async (req, res) => {
        try {
            const result = await flowService.getFlow(req.params.id);
            res.status(200).json(result);
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /flows/{id}:
     *   put:
     *     summary: Update a flow by ID
     *     tags: [Flows]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The flow ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Flow'
     *     responses:
     *       200:
     *         description: The updated flow
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Flow'
     *       500:
     *         description: Server error
     */
    app.put('/flows/:id', async (req, res) => {
        try {
            const createdBy = req.user?.sub || 'unknown';
            const result = await flowService.updateFlow(req.params.id, { ...req.body, updatedBy: createdBy });
            res.status(200).json(result);
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /flows/{id}:
     *   delete:
     *     summary: Delete a flow by ID
     *     tags: [Flows]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The flow ID
     *     responses:
     *       200:
     *         description: The flow was deleted
     *       500:
     *         description: Server error
     */
    app.delete('/flows/:id', async (req, res) => {
        try {
            const result = await flowService.deleteFlow(req.params.id);
            res.status(200).json({ success: result });
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /flows/{id}/stages:
     *   get:
     *     summary: List stages for a flow
     *     tags: [Flows]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The flow ID
     *     responses:
     *       200:
     *         description: A list of stages for the flow
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Stage'
     *       500:
     *         description: Server error
     */
    app.get('/flows/:id/stages', async (req, res) => {
        try {
            const result = await flowService.listStagesByFlow(req.params.id);
            res.status(200).json(result);
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });


    // --- Locations ---

    /**
     * @swagger
     * /locations:
     *   post:
     *     summary: Create a new location
     *     tags: [Locations]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Location'
     *     responses:
     *       201:
     *         description: The created location
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Location'
     *       500:
     *         description: Server error
     */
    app.post('/locations', async (req, res) => {
        try {
            const body = req.body;
            const createdBy = req.user?.sub || 'unknown';
            const result = await flowService.createLocation({ ...body, createdBy, updatedBy: createdBy });
            res.status(201).json(result);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /locations:
     *   get:
     *     summary: List all locations
     *     tags: [Locations]
     *     parameters:
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *         description: Limit the number of results
     *       - in: query
     *         name: offset
     *         schema:
     *           type: integer
     *         description: Offset for pagination
     *     responses:
     *       200:
     *         description: A list of locations
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Location'
     *                 total:
     *                   type: integer
     *       500:
     *         description: Server error
     */
    app.get('/locations', async (req, res) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
            const result = await flowService.listLocations({ limit, offset });
            res.status(200).json(result);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /locations/{id}:
     *   get:
     *     summary: Get a location by ID
     *     tags: [Locations]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The location ID
     *     responses:
     *       200:
     *         description: The location description by ID
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Location'
     *       500:
     *         description: Server error
     */
    app.get('/locations/:id', async (req, res) => {
        try {
            const result = await flowService.getLocation(req.params.id);
            res.status(200).json(result);
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /locations/{id}:
     *   put:
     *     summary: Update a location by ID
     *     tags: [Locations]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The location ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Location'
     *     responses:
     *       200:
     *         description: The updated location
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Location'
     *       500:
     *         description: Server error
     */
    app.put('/locations/:id', async (req, res) => {
        try {
            const createdBy = req.user?.sub || 'unknown';
            const result = await flowService.updateLocation(req.params.id, { ...req.body, updatedBy: createdBy });
            res.status(200).json(result);
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /locations/{id}:
     *   delete:
     *     summary: Delete a location by ID
     *     tags: [Locations]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The location ID
     *     responses:
     *       200:
     *         description: The location was deleted
     *       500:
     *         description: Server error
     */
    app.delete('/locations/:id', async (req, res) => {
        try {
            const result = await flowService.deleteLocation(req.params.id);
            res.status(200).json({ success: result });
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    // --- Stages ---

    /**
     * @swagger
     * /stages:
     *   post:
     *     summary: Create a new stage
     *     tags: [Stages]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Stage'
     *     responses:
     *       201:
     *         description: The created stage
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Stage'
     *       500:
     *         description: Server error
     */
    app.post('/stages', async (req, res) => {
        try {
            const body = req.body;
            const createdBy = req.user?.sub || 'unknown';
            const result = await flowService.createStage({ ...body, createdBy, updatedBy: createdBy });
            res.status(201).json(result);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /stages/{id}:
     *   get:
     *     summary: Get a stage by ID
     *     tags: [Stages]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The stage ID
     *     responses:
     *       200:
     *         description: The stage description by ID
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Stage'
     *       500:
     *         description: Server error
     */
    app.get('/stages/:id', async (req, res) => {
        try {
            const result = await flowService.getStage(req.params.id);
            res.status(200).json(result);
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /stages/{id}:
     *   put:
     *     summary: Update a stage by ID
     *     tags: [Stages]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The stage ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Stage'
     *     responses:
     *       200:
     *         description: The updated stage
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Stage'
     *       500:
     *         description: Server error
     */
    app.put('/stages/:id', async (req, res) => {
        try {
            const createdBy = req.user?.sub || 'unknown';
            const result = await flowService.updateStage(req.params.id, { ...req.body, updatedBy: createdBy });
            res.status(200).json(result);
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    /**
     * @swagger
     * /stages/{id}:
     *   delete:
     *     summary: Delete a stage by ID
     *     tags: [Stages]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: The stage ID
     *     responses:
     *       200:
     *         description: The stage was deleted
     *       500:
     *         description: Server error
     */
    app.delete('/stages/:id', async (req, res) => {
        try {
            const result = await flowService.deleteStage(req.params.id);
            res.status(200).json({ success: result });
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    app.listen(port, () => {
        console.log(`Local server running at http://localhost:${port}`);
        console.log(`API Documentation at http://localhost:${port}/api-docs`);
    });
};

startServer().catch(console.error);
