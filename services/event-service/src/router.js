// routes/eventRoutes.js
import express from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration
} from './eventController.js';
import { protect } from '../../middleware/protect.js';
// import { protect } from '../../shared/middleware/auth.js'; // Standard JWT middleware

const router = express.Router();

// --- Public Routes (Read-only) ---
router.get('/', getEvents);
router.get('/:id', getEventById);

// --- Protected Routes (Requires Authentication) ---
// We apply the middleware to these specific routes
router.post('/', protect, createEvent)
router.put('/:id', protect, updateEvent);
router.delete('/:id', protect, deleteEvent);

// --- Registration Routes ---
router.post('/:id/register', protect, registerForEvent);
router.delete('/:id/register', protect, cancelRegistration);

export  {router as eventRoute};