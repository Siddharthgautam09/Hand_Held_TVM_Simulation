import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Conductor from '../models/Conductor';

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Authenticate conductor and get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if conductor exists
    const conductor = await Conductor.findOne({ username });
    if (!conductor) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, conductor.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    conductor.lastLogin = new Date();
    await conductor.save();

    // Create JWT
    const payload = {
      id: conductor.id,
      username: conductor.username,
      busId: conductor.busId,
      route: conductor.route
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      conductor: {
        id: conductor.id,
        username: conductor.username,
        name: conductor.name,
        busId: conductor.busId,
        route: conductor.route
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register new conductor (admin only)
// @access  Private
router.post('/register', async (req, res) => {
  try {
    const { id, username, password, name, busId, route } = req.body;

    // Check if conductor already exists
    const existingConductor = await Conductor.findOne({ 
      $or: [{ username }, { id }] 
    });

    if (existingConductor) {
      return res.status(400).json({
        success: false,
        message: 'Conductor already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create conductor
    const conductor = new Conductor({
      id,
      username,
      password: hashedPassword,
      name,
      busId,
      route,
      isActive: true
    });

    await conductor.save();

    res.json({
      success: true,
      message: 'Conductor registered successfully',
      conductor: {
        id: conductor.id,
        username: conductor.username,
        name: conductor.name,
        busId: conductor.busId,
        route: conductor.route
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
