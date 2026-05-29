import { Router } from 'express';
import {
  addTicketUpdate,
  addInternalNote,
  assignTicket,
  createTicket,
  deleteTicket,
  getMetrics,
  getTicket,
  listCategories,
  listTickets,
  reopenTicket,
  updateTicketStatus,
  updateTicket
} from '../controllers/ticketController.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { staffMiddleware } from '../middleware/staffMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);

router.get('/categories', asyncHandler(listCategories));
router.get('/metrics', staffMiddleware, asyncHandler(getMetrics));
router.get('/admin/all', staffMiddleware, asyncHandler(listTickets));
router.get('/admin/:id', staffMiddleware, asyncHandler(getTicket));
router.put('/admin/:id/status', staffMiddleware, asyncHandler(updateTicketStatus));
router.put('/admin/:id/assign', staffMiddleware, asyncHandler(assignTicket));
router.post('/admin/:id/notes', staffMiddleware, asyncHandler(addInternalNote));
router.delete('/admin/:id', adminMiddleware, asyncHandler(deleteTicket));
router.get('/', asyncHandler(listTickets));
router.post('/', asyncHandler(createTicket));
router.get('/:id', asyncHandler(getTicket));
router.post('/:id/comments', asyncHandler(addTicketUpdate));
router.post('/:id/reopen', asyncHandler(reopenTicket));
router.post('/:id/updates', asyncHandler(addTicketUpdate));
router.patch('/:id', staffMiddleware, asyncHandler(updateTicket));

export default router;