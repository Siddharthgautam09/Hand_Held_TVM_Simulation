import mongoose, { Document, Schema } from 'mongoose';

export interface IConductor extends Document {
  id: string;
  username: string;
  password: string;
  name: string;
  busId: string;
  route: string;
  isActive: boolean;
  lastLogin: Date;
}

const ConductorSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  busId: { type: String, required: true },
  route: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, {
  timestamps: true
});

export default mongoose.model<IConductor>('Conductor', ConductorSchema);
