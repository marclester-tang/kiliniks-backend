import express from 'express';
import { getDbPool } from '../../utils/db';
import { PostgresRepository } from '../secondary/postgres-repo';
import { ConsolePublisher } from '../secondary/console-publisher';
import { AppointmentService } from '../../core/appointment-service';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

const startServer = async () => {
    const pool = await getDbPool();
    const repo = new PostgresRepository(pool);
    const publisher = new ConsolePublisher();
    const service = new AppointmentService(repo, publisher);

    app.post('/appointments', async (req, res) => {
        try {
            const body = req.body;
            const createdBy = 'local-user';
            const result = await service.createAppointment({ ...body, createdBy });
            res.status(201).json(result);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/appointments', async (req, res) => {
        try {
            const result = await service.listAppointments();
            res.status(200).json(result);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/appointments/:id', async (req, res) => {
        try {
            const result = await service.getAppointment(req.params.id);
            res.status(200).json(result);
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    app.put('/appointments/:id', async (req, res) => {
        try {
            const result = await service.updateAppointment(req.params.id, req.body);
            res.status(200).json(result);
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });

    app.delete('/appointments/:id', async (req, res) => {
        try {
            const result = await service.deleteAppointment(req.params.id);
            res.status(200).json({ success: result });
        } catch (err: any) {
             res.status(500).json({ error: err.message });
        }
    });
    
    app.listen(port, () => {
        console.log(`Local server running at http://localhost:${port}`);
    });
};

startServer().catch(console.error);
