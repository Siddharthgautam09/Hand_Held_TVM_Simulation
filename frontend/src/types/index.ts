export interface Ticket {
  TicketID: string;
  BusID: string;
  Route: string;
  Source: string;
  Destination: string;
  Fare: number;
  PaymentMode: 'Cash' | 'UPI' | 'Wallet';
  Time: string;
  GPS_Location: {
    lat: number;
    lng: number;
  };
  PassID?: string;
  QRCode?: string;
  ConductorID: string;
}

export interface Location {
  BusID: string;
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: string;
  source: 'GPS' | 'GPRS' | 'Manual';
}

export interface RFIDPass {
  passId: string;
  valid: boolean;
  type: 'student' | 'senior' | 'disabled' | 'employee';
  discount: number; // percentage
  expiryDate?: string;
}

export interface Conductor {
  id: string;
  name: string;
  busId: string;
  route: string;
  token?: string;
}

export interface FareTable {
  source: string;
  destination: string;
  fare: number;
  distance: number;
}

export interface MQTTMessage {
  topic: string;
  payload: any;
  timestamp: string;
}

export interface OfflineData {
  tickets: Ticket[];
  locations: Location[];
  lastSync: string;
}

export interface BusStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
}
