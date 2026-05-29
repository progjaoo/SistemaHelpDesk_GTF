import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', asyncHandler(getDashboard));

export default router;
