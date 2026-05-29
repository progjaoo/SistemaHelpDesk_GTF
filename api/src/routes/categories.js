import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  listActiveCategories,
  listAllCategories,
  toggleCategory,
  updateCategory
} from '../controllers/categoryController.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(listActiveCategories));
router.get('/admin', adminMiddleware, asyncHandler(listAllCategories));
router.post('/admin', adminMiddleware, asyncHandler(createCategory));
router.put('/admin/:id', adminMiddleware, asyncHandler(updateCategory));
router.patch('/admin/:id/toggle', adminMiddleware, asyncHandler(toggleCategory));
router.delete('/admin/:id', adminMiddleware, asyncHandler(deleteCategory));

export default router;
