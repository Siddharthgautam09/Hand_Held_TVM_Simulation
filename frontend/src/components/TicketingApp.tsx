import React, { useState, useEffect } from 'react';
import { MapPin, Wifi, WifiOff, CreditCard, Smartphone, QrCode, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useMQTT } from '../context/MQTTContext';
import { useOffline } from '../context/OfflineContext';
import { Ticket, RFIDPass, BusStop } from '../types';
import QRCode from 'qrcode';
import LocationStatus from './LocationStatus';

const busStops: BusStop[] = [
  { id: 'stop1', name: 'Central Station', lat: 28.6139, lng: 77.2090, routes: ['R12', 'R15'] },
  { id: 'stop2', name: 'City Mall', lat: 28.6200, lng: 77.2100, routes: ['R12', 'R20'] },
  { id: 'stop3', name: 'Hospital Junction', lat: 28.6250, lng: 77.2150, routes: ['R15', 'R20'] },
  { id: 'stop4', name: 'University Gate', lat: 28.6300, lng: 77.2200, routes: ['R12', 'R25'] },
  { id: 'stop5', name: 'Airport Terminal', lat: 28.6400, lng: 77.2300, routes: ['R25'] },
];

const fareTable = [
  { source: 'Central Station', destination: 'City Mall', fare: 10 },
  { source: 'Central Station', destination: 'Hospital Junction', fare: 15 },
  { source: 'Central Station', destination: 'University Gate', fare: 20 },
  { source: 'Central Station', destination: 'Airport Terminal', fare: 35 },
  { source: 'City Mall', destination: 'Hospital Junction', fare: 8 },
  { source: 'City Mall', destination: 'University Gate', fare: 12 },
  { source: 'City Mall', destination: 'Airport Terminal', fare: 25 },
  { source: 'Hospital Junction', destination: 'University Gate', fare: 10 },
  { source: 'Hospital Junction', destination: 'Airport Terminal', fare: 20 },
  { source: 'University Gate', destination: 'Airport Terminal', fare: 15 },
];

const TicketingApp: React.FC = () => {
  const { conductor } = useAuth();
  const { currentLocation, startTracking, setManualLocation, isTracking } = useLocation();
  const { publishMessage, isConnected: mqttConnected } = useMQTT();
  const { isOnline, addOfflineData } = useOffline();

  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Wallet'>('Cash');
  const [rfidPassId, setRfidPassId] = useState('');
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [validatedPass, setValidatedPass] = useState<RFIDPass | null>(null);

  useEffect(() => {
    if (!isTracking) {
      startTracking();
    }
  }, []);

  useEffect(() => {
    // Publish location updates via MQTT
    if (currentLocation && conductor) {
      const locationMessage = {
        BusID: conductor.busId,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        timestamp: currentLocation.timestamp,
        source: currentLocation.source
      };

      if (mqttConnected) {
        publishMessage(`/bus/${conductor.busId}/location`, locationMessage);
      }
      
      if (!isOnline) {
        addOfflineData('locations', locationMessage as unknown as Location);
      }
    }
  }, [currentLocation, conductor, mqttConnected, isOnline, publishMessage, addOfflineData]);

  const calculateFare = (src: string, dest: string): number => {
    const route = fareTable.find(
      f => (f.source === src && f.destination === dest) ||
           (f.source === dest && f.destination === src)
    );
    return route ? route.fare : 0;
  };

  const validateRFIDPass = async (passId: string): Promise<RFIDPass | null> => {
    try {
      if (isOnline) {
        const response = await fetch('/api/pass/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passId })
        });
        
        if (response.ok) {
          return await response.json();
        }
      } else {
        // Offline validation using cached data
        const cachedPasses = JSON.parse(localStorage.getItem('cachedPasses') || '[]');
        const pass = cachedPasses.find((p: RFIDPass) => p.passId === passId);
        return pass || null;
      }
    } catch (error) {
      console.error('Error validating RFID pass:', error);
    }
    return null;
  };

  const handleRFIDValidation = async () => {
    if (!rfidPassId.trim()) return;
    
    const pass = await validateRFIDPass(rfidPassId);
    if (pass && pass.valid) {
      setValidatedPass(pass);
      alert(`Valid ${pass.type} pass! Discount: ${pass.discount}%`);
    } else {
      setValidatedPass(null);
      alert('Invalid or expired pass. Please issue regular ticket.');
    }
  };

  const generateTicket = async () => {
    if (!source || !destination || !conductor || !currentLocation) {
      alert('Please fill all required fields and ensure location is available');
      return;
    }

    // Debug conductor object
    console.log('Conductor object:', conductor);
    console.log('Conductor ID:', conductor.id);
    console.log('Conductor busId:', conductor.busId);
    console.log('Conductor route:', conductor.route);

    const baseFare = calculateFare(source, destination);
    const discount = validatedPass ? (baseFare * validatedPass.discount) / 100 : 0;
    const finalFare = Math.max(0, baseFare - discount);

    const ticket: Ticket = {
      TicketID: `T${Date.now()}`,
      BusID: conductor.busId || 'UNKNOWN_BUS',
      Route: conductor.route || 'UNKNOWN_ROUTE',
      Source: source,
      Destination: destination,
      Fare: finalFare,
      PaymentMode: paymentMode,
      Time: new Date().toISOString(),
      GPS_Location: {
        lat: currentLocation.lat,
        lng: currentLocation.lng
      },
      PassID: validatedPass?.passId || undefined,
      ConductorID: conductor.id || 'UNKNOWN_CONDUCTOR'
    };

    console.log('Ticket object being sent:', ticket);

    try {
      // Generate QR Code
      const qrData = JSON.stringify({
        ticketId: ticket.TicketID,
        busId: ticket.BusID,
        fare: ticket.Fare,
        timestamp: ticket.Time
      });
      const qrUrl = await QRCode.toDataURL(qrData);
      ticket.QRCode = qrUrl;
      setQrCodeUrl(qrUrl);

      setCurrentTicket(ticket);

      // Publish ticket via MQTT
      if (mqttConnected) {
        publishMessage(`/bus/${conductor.busId}/tickets`, ticket);
      }

      // Save offline if needed
      if (!isOnline) {
        await addOfflineData('tickets', ticket);
      } else {
        // Send to backend
        try {
          const response = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticket)
          });
          
          if (response.ok) {
            console.log('Ticket saved successfully to backend!');
            alert('Ticket generated and saved to database.');
          } else {
            const errorText = await response.text();
            console.error('Server error saving ticket:', response.status, errorText);
            alert(`Error saving ticket: ${response.status} ${response.statusText}`);
            await addOfflineData('tickets', ticket);
          }
        } catch (error) {
          console.error('Error saving ticket to backend:', error);
          await addOfflineData('tickets', ticket);
          alert('Network error saving ticket. Saved offline.');
        }
      }

      // Reset form
      setSource('');
      setDestination('');
      setRfidPassId('');
      setValidatedPass(null);

    } catch (error) {
      console.error('Error generating ticket:', error);
      alert('Error generating ticket. Please try again.');
    }
  };

  const downloadTicket = () => {
    if (!currentTicket) return;
    
    const dataStr = JSON.stringify(currentTicket, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket_${currentTicket.TicketID}.json`;
    link.click();
  };

  const handleManualLocation = (stopName: string) => {
    const stop = busStops.find(s => s.name === stopName);
    if (stop) {
      setManualLocation({ lat: stop.lat, lng: stop.lng });
    }
  };

  const locationSource = currentLocation?.source || 'N/A';

  if (!conductor) {
    return (
      <div className="htvm-container">
        <div className="ticket-form">
          <h2>Please login to continue</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="htvm-container">
      <div className="ticket-form">
        <div className="header">
          <h1>HTVM Simulation</h1>
          <div className="status-bar">
            <div className="status-item">
              {isOnline ? (
                <><Wifi className="w-4 h-4" /> Online</>
              ) : (
                <><WifiOff className="w-4 h-4" /> Offline</>
              )}
            </div>
            <div className="status-item">
              <div className={`status-indicator ${mqttConnected ? 'status-online' : 'status-offline'}`}></div>
              MQTT {mqttConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <LocationStatus />
        </div>

        {/* Location Status */}
        <div className="location-indicator">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            <span>Location: {locationSource}</span>
          </div>
          {currentLocation && (
            <div className="text-sm mt-1">
              Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
              {currentLocation.accuracy && (
                <span> (±{currentLocation.accuracy}m)</span>
              )}
            </div>
          )}
          
          {locationSource !== 'GPS' && (
            <div className="mt-2">
              <select 
                onChange={(e) => handleManualLocation(e.target.value)}
                className="form-input"
              >
                <option value="">Select Bus Stop</option>
                {busStops.map(stop => (
                  <option key={stop.id} value={stop.name}>{stop.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* RFID Scanner */}
        <div className="rfid-scanner">
          <h3>RFID Pass Scanner</h3>
          <input
            type="text"
            placeholder="Tap RFID card or enter Pass ID"
            value={rfidPassId}
            onChange={(e) => setRfidPassId(e.target.value)}
            className="form-input mb-3"
          />
          <button onClick={handleRFIDValidation} className="btn-secondary">
            Validate Pass
          </button>
          {validatedPass && (
            <div className="mt-2 text-sm">
              ✅ Valid {validatedPass.type} pass - {validatedPass.discount}% discount
            </div>
          )}
        </div>

        {/* Ticket Form */}
        <div className="form-group">
          <label className="form-label">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="form-input"
          >
            <option value="">Select Source</option>
            {busStops.map(stop => (
              <option key={stop.id} value={stop.name}>{stop.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Destination</label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="form-input"
          >
            <option value="">Select Destination</option>
            {busStops.map(stop => (
              <option key={stop.id} value={stop.name}>{stop.name}</option>
            ))}
          </select>
        </div>

        {source && destination && (
          <div className="fare-display">
            <h3>Fare: ₹{calculateFare(source, destination)}</h3>
            {validatedPass && (
              <div>
                Discount: ₹{(calculateFare(source, destination) * validatedPass.discount) / 100}
                <br />
                Final Fare: ₹{Math.max(0, calculateFare(source, destination) - (calculateFare(source, destination) * validatedPass.discount) / 100)}
              </div>
            )}
          </div>
        )}

        {/* Payment Options */}
        <div className="form-group">
          <label className="form-label">Payment Mode</label>
          <div className="payment-options">
            {(['Cash', 'UPI', 'Wallet'] as const).map(mode => (
              <div
                key={mode}
                className={`payment-option ${paymentMode === mode ? 'selected' : ''}`}
                onClick={() => setPaymentMode(mode)}
              >
                {mode === 'Cash' && <CreditCard className="w-6 h-6" />}
                {mode === 'UPI' && <Smartphone className="w-6 h-6" />}
                {mode === 'Wallet' && <QrCode className="w-6 h-6" />}
                <div>{mode}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={generateTicket} className="btn-primary w-full">
          Generate Ticket
        </button>

        {/* Ticket Preview */}
        {currentTicket && (
          <div className="ticket-preview">
            <h3>Ticket Generated</h3>
            <div className="ticket-details">
              <p><strong>Ticket ID:</strong> {currentTicket.TicketID}</p>
              <p><strong>Route:</strong> {currentTicket.Source} → {currentTicket.Destination}</p>
              <p><strong>Fare:</strong> ₹{currentTicket.Fare}</p>
              <p><strong>Payment:</strong> {currentTicket.PaymentMode}</p>
              <p><strong>Time:</strong> {new Date(currentTicket.Time).toLocaleString()}</p>
            </div>
            
            {qrCodeUrl && (
              <div className="qr-code">
                <img src={qrCodeUrl} alt="Ticket QR Code" />
              </div>
            )}
            
            <div className="ticket-actions">
              <button onClick={downloadTicket} className="btn-secondary">
                <Download className="w-4 h-4 mr-2" />
                Save Ticket
              </button>
              <button className="btn-secondary" disabled title="Print disabled in simulation">
                Print Ticket
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketingApp;
