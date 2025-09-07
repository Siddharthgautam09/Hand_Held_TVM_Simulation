import express from 'express';
import RFIDPass from '../models/RFIDPass';

const router = express.Router();

// @route   POST /api/pass/validate
// @desc    Validate RFID pass
// @access  Public
router.post('/validate', async (req, res) => {
  try {
    const { passId } = req.body;

    if (!passId) {
      return res.status(400).json({
        success: false,
        message: 'Pass ID is required'
      });
    }

    const pass = await RFIDPass.findOne({ passId });

    if (!pass) {
      return res.status(404).json({
        success: false,
        message: 'Pass not found',
        valid: false
      });
    }

    // Check if pass is expired
    const isExpired = pass.expiryDate < new Date();
    const isValid = pass.valid && !isExpired;

    if (isValid) {
      // Increment usage count
      pass.usageCount += 1;
      await pass.save();
    }

    res.json({
      success: true,
      valid: isValid,
      type: pass.type,
      discount: pass.discount,
      holderName: pass.holderName,
      expiryDate: pass.expiryDate,
      usageCount: pass.usageCount,
      message: isExpired ? 'Pass has expired' : (isValid ? 'Valid pass' : 'Invalid pass')
    });

  } catch (error) {
    console.error('Error validating pass:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      valid: false
    });
  }
});

// @route   POST /api/pass/create
// @desc    Create new RFID pass (admin only)
// @access  Private
router.post('/create', async (req, res) => {
  try {
    const { passId, type, discount, expiryDate, holderName } = req.body;

    // Check if pass already exists
    const existingPass = await RFIDPass.findOne({ passId });
    if (existingPass) {
      return res.status(400).json({
        success: false,
        message: 'Pass already exists'
      });
    }

    const pass = new RFIDPass({
      passId,
      type,
      discount,
      expiryDate: new Date(expiryDate),
      holderName,
      valid: true,
      usageCount: 0
    });

    await pass.save();

    res.status(201).json({
      success: true,
      data: pass,
      message: 'Pass created successfully'
    });

  } catch (error) {
    console.error('Error creating pass:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/pass/list
// @desc    Get all passes with filters
// @access  Private
router.get('/list', async (req, res) => {
  try {
    const { type, valid, expired, limit = 50, page = 1 } = req.query;
    
    const filter: any = {};
    
    if (type) filter.type = type;
    if (valid !== undefined) filter.valid = valid === 'true';
    if (expired !== undefined) {
      if (expired === 'true') {
        filter.expiryDate = { $lt: new Date() };
      } else {
        filter.expiryDate = { $gte: new Date() };
      }
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const passes = await RFIDPass.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await RFIDPass.countDocuments(filter);

    res.json({
      success: true,
      data: passes,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });

  } catch (error) {
    console.error('Error fetching passes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/pass/:passId/deactivate
// @desc    Deactivate a pass
// @access  Private
router.put('/:passId/deactivate', async (req, res) => {
  try {
    const pass = await RFIDPass.findOne({ passId: req.params.passId });
    
    if (!pass) {
      return res.status(404).json({
        success: false,
        message: 'Pass not found'
      });
    }

    pass.valid = false;
    await pass.save();

    res.json({
      success: true,
      message: 'Pass deactivated successfully',
      data: pass
    });

  } catch (error) {
    console.error('Error deactivating pass:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/pass/stats
// @desc    Get pass usage statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const totalPasses = await RFIDPass.countDocuments();
    const activePasses = await RFIDPass.countDocuments({ valid: true, expiryDate: { $gte: new Date() } });
    const expiredPasses = await RFIDPass.countDocuments({ expiryDate: { $lt: new Date() } });
    const inactivePasses = await RFIDPass.countDocuments({ valid: false });

    const typeStats = await RFIDPass.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 }, totalUsage: { $sum: '$usageCount' } } }
    ]);

    const usageStats = await RFIDPass.aggregate([
      { $group: { _id: null, totalUsage: { $sum: '$usageCount' }, avgUsage: { $avg: '$usageCount' } } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalPasses,
          active: activePasses,
          expired: expiredPasses,
          inactive: inactivePasses
        },
        byType: typeStats,
        usage: usageStats[0] || { totalUsage: 0, avgUsage: 0 }
      }
    });

  } catch (error) {
    console.error('Error fetching pass stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
