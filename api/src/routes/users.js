import { Router } from 'express';
import {
  createUser,
  deleteUser,
  forcePasswordReset,
  getAdminUser,
  getMyUser,
  listUsers,
  updateMyUser,
  updateMyUserPassword,
  updateUser,
  updateUserActive,
  updateUserRole
} from '../controllers/userController.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', asyncHandler(getMyUser));
router.put('/me', asyncHandler(updateMyUser));
router.put('/me/password', asyncHandler(updateMyUserPassword));

router.use(adminMiddleware);

router.get('/', asyncHandler(listUsers));
router.get('/admin', asyncHandler(listUsers));
router.post('/admin', asyncHandler(createUser));
router.get('/admin/:id', asyncHandler(getAdminUser));
router.put('/admin/:id/role', asyncHandler(updateUserRole));
router.put('/admin/:id/active', asyncHandler(updateUserActive));
router.put('/admin/:id/reset-password', asyncHandler(forcePasswordReset));
router.delete('/admin/:id', asyncHandler(deleteUser));
router.patch('/:id', asyncHandler(updateUser));

export default router;
