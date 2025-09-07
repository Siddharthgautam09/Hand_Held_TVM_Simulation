import mqtt from 'mqtt';
import { ITicket } from '../models/Ticket';
import { ILocation } from '../models/Location';
import Ticket from '../models/Ticket';
import Location from '../models/Location';

export class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private readonly brokerUrl: string;

  constructor() {
    this.brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://test.mosquitto.org:1883';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.client = mqtt.connect(this.brokerUrl, {
          clientId: `htvm_backend_${Math.random().toString(16).substr(2, 8)}`,
          clean: true,
          connectTimeout: 4000,
          username: process.env.MQTT_USERNAME,
          password: process.env.MQTT_PASSWORD,
        });

        this.client.on('connect', () => {
          console.log('MQTT Backend Service connected to broker');
          this.setupSubscriptions();
          resolve();
        });

        this.client.on('error', (err) => {
          console.error('MQTT connection error:', err);
          reject(err);
        });

        this.client.on('close', () => {
          console.log('MQTT connection closed');
        });

        this.client.on('message', (topic, payload) => {
          this.handleMessage(topic, payload);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private setupSubscriptions(): void {
    if (!this.client) return;

    // Subscribe to all bus location updates
    this.client.subscribe('/bus/+/location', { qos: 1 });
    
    // Subscribe to all bus ticket events
    this.client.subscribe('/bus/+/tickets', { qos: 1 });
    
    // Subscribe to system events
    this.client.subscribe('/system/+', { qos: 1 });

    console.log('MQTT subscriptions established');
  }

  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const message = JSON.parse(payload.toString());
      
      if (topic.includes('/location')) {
        await this.handleLocationUpdate(message);
      } else if (topic.includes('/tickets')) {
        await this.handleTicketEvent(message);
      } else if (topic.includes('/system')) {
        await this.handleSystemEvent(topic, message);
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  }

  private async handleLocationUpdate(locationData: any): Promise<void> {
    try {
      const location = new Location({
        BusID: locationData.BusID,
        lat: locationData.lat,
        lng: locationData.lng,
        accuracy: locationData.accuracy,
        timestamp: new Date(locationData.timestamp),
        source: locationData.source,
        stopName: locationData.stopName
      });

      await location.save();
      console.log(`Location saved for bus ${locationData.BusID}`);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  }

  private async handleTicketEvent(ticketData: any): Promise<void> {
    try {
      // Check if ticket already exists
      const existingTicket = await Ticket.findOne({ TicketID: ticketData.TicketID });
      if (existingTicket) {
        console.log(`Ticket ${ticketData.TicketID} already exists, skipping`);
        return;
      }

      const ticket = new Ticket({
        TicketID: ticketData.TicketID,
        BusID: ticketData.BusID,
        Route: ticketData.Route,
        Source: ticketData.Source,
        Destination: ticketData.Destination,
        Fare: ticketData.Fare,
        PaymentMode: ticketData.PaymentMode,
        Time: new Date(ticketData.Time),
        GPS_Location: ticketData.GPS_Location,
        PassID: ticketData.PassID,
        QRCode: ticketData.QRCode,
        ConductorID: ticketData.ConductorID || 'unknown'
      });

      await ticket.save();
      console.log(`Ticket saved: ${ticketData.TicketID}`);
    } catch (error) {
      console.error('Error saving ticket:', error);
    }
  }

  private async handleSystemEvent(topic: string, data: any): Promise<void> {
    console.log(`System event received on ${topic}:`, data);
    // Handle system-wide events like sync, alerts, etc.
  }

  async publish(topic: string, payload: any): Promise<void> {
    if (!this.client) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await new Promise<void>((resolve, reject) => {
        this.client!.end(false, {}, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.client = null;
      console.log('MQTT service disconnected');
    }
  }
}
