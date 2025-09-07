import mongoose, { Document, Schema } from 'mongoose';

export interface ILocation extends Document {
  BusID: string;
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: Date;
  source: 'GPS' | 'GPRS' | 'Manual';
  stopName?: string;
}

const LocationSchema: Schema = new Schema({
  BusID: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  accuracy: { type: Number },
  timestamp: { type: Date, default: Date.now },
  source: { type: String, enum: ['GPS', 'GPRS', 'Manual'], required: true },
  stopName: { type: String }
}, {
  timestamps: true
});

// Index for efficient queries
LocationSchema.index({ BusID: 1, timestamp: -1 });
LocationSchema.index({ timestamp: -1 });

export default mongoose.model<ILocation>('Location', LocationSchema);
