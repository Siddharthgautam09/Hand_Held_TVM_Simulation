import express from 'express';
import Location from '../models/Location';

const router = express.Router();

// @route   POST /api/locations
// @desc    Save location data
// @access  Public
router.post('/', async (req, res) => {
  try {
    const locationData = req.body;
    
    const location = new Location({
      ...locationData,
      timestamp: new Date(locationData.timestamp || Date.now())
    });

    await location.save();

    res.status(201).json({
      success: true,
      data: location
    });

  } catch (error) {
    console.error('Error saving location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/locations/bus/:busId
// @desc    Get location history for a bus
// @access  Private
router.get('/bus/:busId', async (req, res) => {
  try {
    const { busId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;
    
    const filter: any = { BusID: busId };
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate as string);
      if (endDate) filter.timestamp.$lte = new Date(endDate as string);
    }

    const locations = await Location.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string));

    res.json({
      success: true,
      data: locations
    });

  } catch (error) {
    console.error('Error fetching bus locations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/locations/live
// @desc    Get current locations of all buses
// @access  Private
router.get('/live', async (req, res) => {
  try {
    // Get the latest location for each bus
    const latestLocations = await Location.aggregate([
      { $sort: { BusID: 1, timestamp: -1 } },
      { $group: {
          _id: '$BusID',
          latestLocation: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$latestLocation' } },
      { $match: { timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) } } } // Last 30 minutes
    ]);

    res.json({
      success: true,
      data: latestLocations
    });

  } catch (error) {
    console.error('Error fetching live locations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/locations/stats
// @desc    Get location tracking statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const totalLocations = await Location.countDocuments();
    
    const sourceStats = await Location.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    const busStats = await Location.aggregate([
      { $group: { _id: '$BusID', locationCount: { $sum: 1 }, lastUpdate: { $max: '$timestamp' } } }
    ]);

    const todayStats = await Location.aggregate([
      { $match: { timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalLocations,
        bySource: sourceStats,
        byBus: busStats,
        today: todayStats
      }
    });

  } catch (error) {
    console.error('Error fetching location stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
