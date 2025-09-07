import mongoose, { Document, Schema } from 'mongoose';

export interface IRFIDPass extends Document {
  passId: string;
  valid: boolean;
  type: 'student' | 'senior' | 'disabled' | 'employee';
  discount: number;
  expiryDate: Date;
  holderName: string;
  issuedDate: Date;
  usageCount: number;
}

const RFIDPassSchema: Schema = new Schema({
  passId: { type: String, required: true, unique: true },
  valid: { type: Boolean, default: true },
  type: { type: String, enum: ['student', 'senior', 'disabled', 'employee'], required: true },
  discount: { type: Number, required: true }, // percentage
  expiryDate: { type: Date, required: true },
  holderName: { type: String, required: true },
  issuedDate: { type: Date, default: Date.now },
  usageCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Index for fast lookup
RFIDPassSchema.index({ passId: 1 });
RFIDPassSchema.index({ expiryDate: 1 });

export default mongoose.model<IRFIDPass>('RFIDPass', RFIDPassSchema);
