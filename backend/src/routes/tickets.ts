import express from 'express';
import Ticket from '../models/Ticket';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// @route   POST /api/tickets
// @desc    Create a new ticket
// @access  Private
router.post('/', async (req, res) => {
  try {
    const ticketData = req.body;
    
    // Check if ticket already exists
    const existingTicket = await Ticket.findOne({ TicketID: ticketData.TicketID });
    if (existingTicket) {
      return res.status(400).json({
        success: false,
        message: 'Ticket already exists'
      });
    }

    const ticket = new Ticket({
      ...ticketData,
      Time: new Date(ticketData.Time || Date.now())
    });

    await ticket.save();

    res.status(201).json({
      success: true,
      data: ticket
    });

  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/tickets
// @desc    Get tickets with filters
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { busId, route, startDate, endDate, limit = 50, page = 1 } = req.query;
    
    const filter: any = {};
    
    if (busId) filter.BusID = busId;
    if (route) filter.Route = route;
    if (startDate || endDate) {
      filter.Time = {};
      if (startDate) filter.Time.$gte = new Date(startDate as string);
      if (endDate) filter.Time.$lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const tickets = await Ticket.find(filter)
      .sort({ Time: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Ticket.countDocuments(filter);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/tickets/:id
// @desc    Get single ticket
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ TicketID: req.params.id });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: ticket
    });

  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/tickets/stats/revenue
// @desc    Get revenue statistics
// @access  Private
router.get('/stats/revenue', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.Time = {};
      if (startDate) matchStage.Time.$gte = new Date(startDate as string);
      if (endDate) matchStage.Time.$lte = new Date(endDate as string);
    }

    let groupStage: any;
    switch (groupBy) {
      case 'hour':
        groupStage = {
          _id: {
            year: { $year: '$Time' },
            month: { $month: '$Time' },
            day: { $dayOfMonth: '$Time' },
            hour: { $hour: '$Time' }
          }
        };
        break;
      case 'day':
        groupStage = {
          _id: {
            year: { $year: '$Time' },
            month: { $month: '$Time' },
            day: { $dayOfMonth: '$Time' }
          }
        };
        break;
      case 'month':
        groupStage = {
          _id: {
            year: { $year: '$Time' },
            month: { $month: '$Time' }
          }
        };
        break;
      default:
        groupStage = { _id: null };
    }

    groupStage.totalRevenue = { $sum: '$Fare' };
    groupStage.ticketCount = { $sum: 1 };
    groupStage.avgFare = { $avg: '$Fare' };

  const pipeline: any[] = [
      { $match: matchStage },
      { $group: groupStage }
    ];
    // If grouping by day, month, or hour, sort by year/month/day/hour fields
    if (groupBy === 'hour') {
      pipeline.push({ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } });
    } else if (groupBy === 'day') {
      pipeline.push({ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } });
    } else if (groupBy === 'month') {
      pipeline.push({ $sort: { '_id.year': 1, '_id.month': 1 } });
    }

    const stats = await Ticket.aggregate(pipeline);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
