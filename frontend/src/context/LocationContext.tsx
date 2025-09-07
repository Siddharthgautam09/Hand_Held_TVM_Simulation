import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Location } from '../types';

interface LocationContextType {
  currentLocation: Location | null;
  locationSource: 'GPS' | 'GPRS' | 'Manual';
  startTracking: () => void;
  stopTracking: () => void;
  setManualLocation: (location: { lat: number; lng: number; stopName: string }) => void;
  isTracking: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationSource, setLocationSource] = useState<'GPS' | 'GPRS' | 'Manual'>('GPS');
  const [isTracking, setIsTracking] = useState(false);
  
  // Generate a default bus ID for simulation
  const busID = `BUS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const [watchId, setWatchId] = useState<number | null>(null);

  const startTracking = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported');
      fallbackToGPRS();
      return;
    }

    setIsTracking(true);
    
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const location: Location = {
          BusID: busID,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          source: 'GPS'
        };
        setCurrentLocation(location);
        setLocationSource('GPS');
      },
      (error) => {
        console.error('GPS error:', error);
        fallbackToGPRS();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
    
    setWatchId(id);
  };

  const fallbackToGPRS = () => {
    // Simulate GPRS location (network triangulation)
    // In real implementation, this would call a cellular network API
    const baseLocation = { lat: 28.6139, lng: 77.2090 }; // Delhi center
    const randomOffset = () => (Math.random() - 0.5) * 0.01; // ~500m radius
    
    const location: Location = {
      BusID: busID,
      lat: baseLocation.lat + randomOffset(),
      lng: baseLocation.lng + randomOffset(),
      accuracy: 500,
      timestamp: new Date().toISOString(),
      source: 'GPRS'
    };
    
    setCurrentLocation(location);
    setLocationSource('GPRS');
  };

  const setManualLocation = (manualLoc: { lat: number; lng: number; stopName: string }) => {
    const location: Location = {
      BusID: busID,
      lat: manualLoc.lat,
      lng: manualLoc.lng,
      timestamp: new Date().toISOString(),
      source: 'Manual'
    };
    
    setCurrentLocation(location);
    setLocationSource('Manual');
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  useEffect(() => {
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <LocationContext.Provider value={{
      currentLocation,
      locationSource,
      startTracking,
      stopTracking,
      setManualLocation,
      isTracking
    }}>
      {children}
    </LocationContext.Provider>
  );
};
