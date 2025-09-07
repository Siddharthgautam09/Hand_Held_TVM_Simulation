import express from 'express';
import Ticket from '../models/Ticket';
import Location from '../models/Location';
import RFIDPass from '../models/RFIDPass';

const router = express.Router();

// @route   GET /api/reports/dashboard
// @desc    Get dashboard summary data
// @access  Private
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    // Today's statistics
    const todayTickets = await Ticket.countDocuments({
      Time: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const todayRevenue = await Ticket.aggregate([
      { $match: { Time: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: null, total: { $sum: '$Fare' } } }
    ]);
    
    const todayPassUsage = await Ticket.countDocuments({
      Time: { $gte: startOfDay, $lte: endOfDay },
      PassID: { $exists: true, $ne: null }
    });
    
    // Active buses (with location updates in last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const activeBuses = await Location.distinct('BusID', {
      timestamp: { $gte: thirtyMinutesAgo }
    });
    
    // Total statistics
    const totalTickets = await Ticket.countDocuments();
    const totalRevenue = await Ticket.aggregate([
      { $group: { _id: null, total: { $sum: '$Fare' } } }
    ]);
    
    const totalPasses = await RFIDPass.countDocuments({ valid: true });
    
    // Payment mode distribution (today)
    const paymentDistribution = await Ticket.aggregate([
      { $match: { Time: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: '$PaymentMode', count: { $sum: 1 }, revenue: { $sum: '$Fare' } } }
    ]);
    
    // Route performance (today)
    const routePerformance = await Ticket.aggregate([
      { $match: { Time: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: '$Route', ticketCount: { $sum: 1 }, revenue: { $sum: '$Fare' } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        today: {
          tickets: todayTickets,
          revenue: todayRevenue[0]?.total || 0,
          passUsage: todayPassUsage,
          activeBuses: activeBuses.length
        },
        totals: {
          tickets: totalTickets,
          revenue: totalRevenue[0]?.total || 0,
          activePasses: totalPasses,
          totalBuses: activeBuses.length
        },
        distributions: {
          paymentModes: paymentDistribution,
          topRoutes: routePerformance
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/revenue
// @desc    Get detailed revenue reports
// @access  Private
router.get('/revenue', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day', busId, route } = req.query;
    
    const matchStage: any = {};
    
    if (startDate || endDate) {
      matchStage.Time = {};
      if (startDate) matchStage.Time.$gte = new Date(startDate as string);
      if (endDate) matchStage.Time.$lte = new Date(endDate as string);
    }
    
    if (busId) matchStage.BusID = busId;
    if (route) matchStage.Route = route;

    let groupStage: any;
    switch (groupBy) {
      case 'hour':
        groupStage = {
          _id: {
            year: { $year: '$Time' },
            month: { $month: '$Time' },
            day: { $dayOfMonth: '$Time' },
            hour: { $hour: '$Time' }
          },
          period: {
            $dateToString: {
              format: '%Y-%m-%d %H:00',
              date: '$Time'
            }
          }
        };
        break;
      case 'day':
        groupStage = {
          _id: {
            year: { $year: '$Time' },
            month: { $month: '$Time' },
            day: { $dayOfMonth: '$Time' }
          },
          period: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$Time'
            }
          }
        };
        break;
      case 'month':
        groupStage = {
          _id: {
            year: { $year: '$Time' },
            month: { $month: '$Time' }
          },
          period: {
            $dateToString: {
              format: '%Y-%m',
              date: '$Time'
            }
          }
        };
        break;
      default:
        groupStage = {
          _id: null,
          period: { $literal: 'Total' }
        };
    }

    groupStage.totalRevenue = { $sum: '$Fare' };
    groupStage.ticketCount = { $sum: 1 };
    groupStage.avgFare = { $avg: '$Fare' };
    groupStage.passTickets = {
      $sum: {
        $cond: [{ $ne: ['$PassID', null] }, 1, 0]
      }
    };
    groupStage.cashRevenue = {
      $sum: {
        $cond: [{ $eq: ['$PaymentMode', 'Cash'] }, '$Fare', 0]
      }
    };
    groupStage.digitalRevenue = {
      $sum: {
        $cond: [{ $in: ['$PaymentMode', ['UPI', 'Wallet']] }, '$Fare', 0]
      }
    };

    const pipeline = [
      { $match: matchStage },
      { $group: groupStage }
    ];
    // If grouping by hour, day, or month, sort by year/month/day/hour fields
    if (groupBy === 'hour') {
      (pipeline as any[]).push({ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } });
    } else if (groupBy === 'day') {
      (pipeline as any[]).push({ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } });
    } else if (groupBy === 'month') {
      (pipeline as any[]).push({ $sort: { '_id.year': 1, '_id.month': 1 } });
    }

    const revenueData = await Ticket.aggregate(pipeline as any[]);

    res.json({
      success: true,
      data: revenueData
    });

  } catch (error) {
    console.error('Error fetching revenue report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/passes
// @desc    Get pass usage reports
// @access  Private
router.get('/passes', async (req, res) => {
  try {
    const { startDate, endDate, passType } = req.query;
    
    const matchStage: any = {
      PassID: { $exists: true, $ne: null }
    };
    
    if (startDate || endDate) {
      matchStage.Time = {};
      if (startDate) matchStage.Time.$gte = new Date(startDate as string);
      if (endDate) matchStage.Time.$lte = new Date(endDate as string);
    }

    // Get pass usage from tickets
    const passUsageFromTickets = await Ticket.aggregate([
      { $match: matchStage },
      { $group: {
          _id: '$PassID',
          usageCount: { $sum: 1 },
          totalSavings: { $sum: { $subtract: [10, '$Fare'] } }, // Assuming base fare of 10
          lastUsed: { $max: '$Time' }
        }
      },
      { $sort: { usageCount: -1 } }
    ]);

    // Get pass details
    const passDetails = await RFIDPass.aggregate([
      ...(passType ? [{ $match: { type: passType } }] : []),
      { $group: {
          _id: '$type',
          totalPasses: { $sum: 1 },
          activePasses: { $sum: { $cond: [{ $and: [{ $eq: ['$valid', true] }, { $gte: ['$expiryDate', new Date()] }] }, 1, 0] } },
          totalUsage: { $sum: '$usageCount' },
          avgDiscount: { $avg: '$discount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        usageFromTickets: passUsageFromTickets,
        passTypeStats: passDetails
      }
    });

  } catch (error) {
    console.error('Error fetching pass report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/locations
// @desc    Get location tracking reports
// @access  Private
router.get('/locations', async (req, res) => {
  try {
    const { busId, startDate, endDate } = req.query;
    
    const matchStage: any = {};
    
    if (busId) matchStage.BusID = busId;
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate as string);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate as string);
    }

    // Location source distribution
    const sourceDistribution = await Location.aggregate([
      { $match: matchStage },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    // Bus activity summary
    const busActivity = await Location.aggregate([
      { $match: matchStage },
      { $group: {
          _id: '$BusID',
          locationUpdates: { $sum: 1 },
          firstUpdate: { $min: '$timestamp' },
          lastUpdate: { $max: '$timestamp' },
          sources: { $addToSet: '$source' }
        }
      },
      { $sort: { locationUpdates: -1 } }
    ]);

    // Hourly tracking pattern
    const hourlyPattern = await Location.aggregate([
      { $match: matchStage },
      { $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        sourceDistribution,
        busActivity,
        hourlyPattern
      }
    });

  } catch (error) {
    console.error('Error fetching location report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
