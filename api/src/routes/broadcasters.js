import { Router } from 'express';
import {
  createBroadcaster,
  deleteBroadcaster,
  listActiveBroadcasters,
  listAllBroadcasters,
  toggleBroadcaster,
  updateBroadcaster
} from '../controllers/broadcasterController.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(listActiveBroadcasters));
router.get('/admin', adminMiddleware, asyncHandler(listAllBroadcasters));
router.post('/admin', adminMiddleware, asyncHandler(createBroadcaster));
router.put('/admin/:id', adminMiddleware, asyncHandler(updateBroadcaster));
router.patch('/admin/:id/toggle', adminMiddleware, asyncHandler(toggleBroadcaster));
router.delete('/admin/:id', adminMiddleware, asyncHandler(deleteBroadcaster));

export default router;
