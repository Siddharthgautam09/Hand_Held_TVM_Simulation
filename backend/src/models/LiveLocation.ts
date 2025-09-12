import mongoose from 'mongoose';

const LiveLocationSchema = new mongoose.Schema({
  BusID: { 
    type: String, 
    required: true,
    index: true 
  },
  ConductorID: { 
    type: String, 
    required: true 
  },
  Route: { 
    type: String, 
    required: true 
  },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  accuracy: { 
    type: Number, 
    default: 0 
  },
  source: { 
    type: String, 
    enum: ['GPS', 'GPRS'], 
    default: 'GPS' 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  isOnline: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true,
  collection: 'liveLocation'
});

// Create index for efficient queries
LiveLocationSchema.index({ BusID: 1, timestamp: -1 });

export default mongoose.model('LiveLocation', LiveLocationSchema);