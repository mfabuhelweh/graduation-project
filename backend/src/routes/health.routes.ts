import {Router} from 'express';
import {getDemoAuthHealth, getHealth} from '../controllers/health.controller.js';

export const healthRoutes = Router();

healthRoutes.get('/', getHealth);
healthRoutes.get('/demo-auth', getDemoAuthHealth);
