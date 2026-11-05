// controllers/eventController.js
// import Event from './Event.js';
import mongoose from 'mongoose';
import { Event } from '../../models/Event.js';

/**
 * Get all events (with filtering, sorting, and pagination)
 * Route: GET /api/events
 */
export const getEvents = async (req, res) => {
  try {
    const { 
      type, mode, status, society, college, 
      search, page = 1, limit = 10, sort = 'startDate' , institution
    } = req.query;

    // Build dynamic filter
    const filter = { isPublic: true }; // Only show public events by default
    
    if (type) filter.type = type;
    if (mode) filter.mode = mode;
    if (status) filter.status = status;
    if (society) filter.society = society;
    if (college) filter.college = college;
    if (institution) filter.institution = institution;
    
    // Search by title or description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute Query with Population
    const events = await Event.find(filter)
      .populate('society', 'name logo')
      .populate('organizer', 'name email')
      // .populate('college', 'name')
      .populate('institution', 'name')
      .sort({ [sort]: 1 }) // Default: Ascending by startDate
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination info
    const total = await Event.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: events,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total
      }
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, message: 'Server error fetching events' });
  }
};

/**
 * Get a single event by ID
 * Route: GET /api/events/:id
 */
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    const event = await Event.findById(id)
      .populate('society', 'name logo description')
      .populate('organizer', 'name email')
      .populate('college', 'name')
      .populate('institution', 'name')
      .populate('registeredUsers.user', 'name email avatar');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Auto-update status logic if requested (Optional dynamic check)
    await updateEventStatus(event);

    res.status(200).json({ success: true, data: event });

  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ success: false, message: 'Server error fetching event' });
  }
};

/**
 * Create a new event
 * Route: POST /api/events
 */
export const createEvent = async (req, res) => {
  try {
    // Assuming 'protect' middleware adds `req.user`
    const organizerId = req.user._id;
    // const organizerId = '6a3e01ed64b9749772caa33c'; // Hardcoded for testing purposes
    // console.log(req.body)
    // Extract data from body
    const eventData = { ...req.body, organizer: organizerId };

    // Create and save the event
    const newEvent = new Event(eventData);
    await newEvent.save();

    // Populate references for the response
    await newEvent.populate('society', 'name');
    // await newEvent.populate('college', 'name');
    await newEvent.populate('institution', 'name');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent
    });

  } catch (error) {
    console.error('Error creating event:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Server error creating event' });
  }
};

/**
 * Update an existing event
 * Route: PUT /api/events/:id
 */
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Authorization: Ensure the organizer is the one updating
    if (event.organizer.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this event' });
    }

    // Update fields
    const updatedEvent = await Event.findByIdAndUpdate(
      id, 
      { ...req.body }, 
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: updatedEvent
    });

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ success: false, message: 'Server error updating event' });
  }
};

/**
 * Delete an event
 * Route: DELETE /api/events/:id
 */
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Authorization
    if (event.organizer.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this event' });
    }

    await event.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, message: 'Server error deleting event' });
  }
};

/**
 * Register a user for an event
 * Route: POST /api/events/:id/register
 */
export const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // 1. Check if event is open for registration
    if (event.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Event is cancelled' });
    }
    if (event.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Event has already ended' });
    }
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return res.status(400).json({ success: false, message: 'Registration deadline has passed' });
    }

    // 2. Check if capacity is full
    if (event.capacity && event.registeredUsers.length >= event.capacity) {
      return res.status(400).json({ success: false, message: 'Event is full' });
    }

    // 3. Check if user is already registered
    const isRegistered = event.registeredUsers.some(
      reg => reg.user.toString() === userId.toString()
    );
    if (isRegistered) {
      return res.status(400).json({ success: false, message: 'You are already registered for this event' });
    }

    // 4. Add user to registered list
    event.registeredUsers.push({ user: userId });
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Successfully registered for the event',
      registeredCount: event.registeredUsers.length
    });

  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ success: false, message: 'Server error registering for event' });
  }
};

/**
 * Cancel a user's registration for an event
 * Route: DELETE /api/events/:id/register
 */
export const cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Filter out the user
    event.registeredUsers = event.registeredUsers.filter(
      reg => reg.user.toString() !== userId.toString()
    );
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling registration:', error);
    res.status(500).json({ success: false, message: 'Server error cancelling registration' });
  }
};

// --- Helper Functions ---

/**
 * Automatically update status based on current date/time
 */
const updateEventStatus = async (event) => {
  const now = new Date();
  let newStatus = event.status;

  if (event.status === 'cancelled') return; // Don't auto-update cancelled

  if (now > event.endDate) {
    newStatus = 'completed';
  } else if (now >= event.startDate && now <= event.endDate) {
    newStatus = 'ongoing';
  } else if (now < event.startDate) {
    newStatus = 'upcoming';
  }

  if (newStatus !== event.status) {
    event.status = newStatus;
    await event.save();
  }
};