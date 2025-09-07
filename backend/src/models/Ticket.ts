import mongoose, { Document, Schema } from 'mongoose';

export interface ITicket extends Document {
  TicketID: string;
  BusID: string;
  Route: string;
  Source: string;
  Destination: string;
  Fare: number;
  PaymentMode: 'Cash' | 'UPI' | 'Wallet';
  Time: Date;
  GPS_Location: {
    lat: number;
    lng: number;
  };
  PassID?: string;
  QRCode?: string;
  ConductorID: string;
}

const TicketSchema: Schema = new Schema({
  TicketID: { type: String, required: true, unique: true },
  BusID: { type: String, required: true },
  Route: { type: String, required: true },
  Source: { type: String, required: true },
  Destination: { type: String, required: true },
  Fare: { type: Number, required: true },
  PaymentMode: { type: String, enum: ['Cash', 'UPI', 'Wallet'], required: true },
  Time: { type: Date, default: Date.now },
  GPS_Location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  PassID: { type: String },
  QRCode: { type: String },
  ConductorID: { type: String, required: true }
}, {
  timestamps: true
});

// Index for better query performance
TicketSchema.index({ BusID: 1, Time: -1 });
TicketSchema.index({ Route: 1, Time: -1 });
TicketSchema.index({ PassID: 1 });

export default mongoose.model<ITicket>('Ticket', TicketSchema);
