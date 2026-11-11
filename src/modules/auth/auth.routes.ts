import { Router } from 'express';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { login, register } from './auth.controller';
import { loginSchema, registerSchema } from './auth.validation';

const authRoutes = Router();

authRoutes.post('/register', validateBody(registerSchema), register);
authRoutes.post('/login', validateBody(loginSchema), login);

export default authRoutes;
