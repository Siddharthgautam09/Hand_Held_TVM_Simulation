import express from 'express';
import LiveLocation from '../models/LiveLocation';

const router = express.Router();

// Save new live location data
router.post('/', async (req, res) => {
  try {
    const { 
      BusID, 
      ConductorID, 
      Route, 
      lat, 
      lng, 
      accuracy, 
      source, 
      isOnline 
    } = req.body;

    // Validate required fields
    if (!BusID || !ConductorID || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create new location entry
    const liveLocation = new LiveLocation({
      BusID,
      ConductorID,
      Route,
      coordinates: {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      },
      accuracy: accuracy || 0,
      source: source || 'GPS',
      timestamp: new Date(),
      isOnline: isOnline !== undefined ? isOnline : true
    });

    await liveLocation.save();

    res.status(201).json({
      success: true,
      message: 'Live location saved successfully',
      location: liveLocation
    });

  } catch (error) {
    console.error('Error saving live location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error saving live location'
    });
  }
});

// Get latest location for a specific bus
router.get('/bus/:busId', async (req, res) => {
  try {
    const { busId } = req.params;
    
    const location = await LiveLocation.findOne({ BusID: busId })
      .sort({ timestamp: -1 })
      .limit(1);

    res.json({
      success: true,
      location: location
    });
  } catch (error) {
    console.error('Error fetching latest location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching location'
    });
  }
});

// Batch insert multiple location records (for offline sync)
router.post('/batch', async (req, res) => {
  try {
    const { locations } = req.body;
    
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No location data provided'
      });
    }
    
    // Format the locations to match the schema
    const formattedLocations = locations.map(loc => ({
      BusID: loc.BusID,
      ConductorID: loc.ConductorID,
      Route: loc.Route,
      coordinates: {
        lat: parseFloat(loc.lat),
        lng: parseFloat(loc.lng)
      },
      accuracy: loc.accuracy || 0,
      source: loc.source || 'GPS',
      timestamp: loc.timestamp ? new Date(loc.timestamp) : new Date(),
      isOnline: loc.isOnline !== undefined ? loc.isOnline : false
    }));
    
    // Insert all location records
    await LiveLocation.insertMany(formattedLocations);
    
    res.status(201).json({
      success: true,
      message: `${formattedLocations.length} location records saved successfully`
    });
    
  } catch (error) {
    console.error('Error saving batch locations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error saving batch locations'
    });
  }
});

export default router;