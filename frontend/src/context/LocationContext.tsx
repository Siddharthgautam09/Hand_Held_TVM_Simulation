import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useOffline } from './OfflineContext';

interface LocationContextProps {
  children: React.ReactNode;
}

interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  source?: string;
  timestamp?: string;
}

interface LocationContextType {
  currentLocation: Coordinates | null;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  setManualLocation: (location: Coordinates) => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

export const LocationProvider: React.FC<LocationContextProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { conductor } = useAuth();
  const { isOnline, addOfflineData } = useOffline();
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Start tracking location
  const startTracking = () => {
    setIsTracking(true);
  };
  
  // Stop tracking location
  const stopTracking = () => {
    setIsTracking(false);
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };
  
  // Set manual location
  const setManualLocation = (location: Coordinates) => {
    const updatedLocation = {
      ...location,
      source: 'Manual',
      accuracy: location.accuracy || 0,
      timestamp: new Date().toISOString()
    };
    setCurrentLocation(updatedLocation);
    saveLiveLocation(updatedLocation);
  };

  const saveLiveLocation = async (location: Coordinates) => {
    if (!conductor) return;
    
    const locationData = {
      BusID: conductor.busId,
      ConductorID: conductor.id,
      Route: conductor.route,
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy || 0,
      source: location.source || 'GPS',
      isOnline: isOnline,
      timestamp: new Date().toISOString()
    };
    
    if (isOnline) {
      try {
        await fetch('/api/liveLocation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(locationData)
        });
      } catch (error) {
        console.error('Error saving location:', error);
        // Save failed location update to offline storage
        addOfflineData('liveLocation', locationData);
      }
    } else {
      // Save to offline storage when device is offline
      addOfflineData('liveLocation', locationData);
    }
  };

  // Use GPS to get location with fallback to GPRS
  useEffect(() => {
    if (!isTracking || !conductor) return;
    
    let watchId: number;
    
    // Function to get location via GPS
    const getGPSLocation = () => {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              source: 'GPS',
              timestamp: new Date().toISOString()
            };
            setCurrentLocation(newLocation);
            saveLiveLocation(newLocation);
          },
          (error) => {
            console.log('GPS Error:', error);
            // Fallback to GPRS if GPS fails
            fallbackToGPRS();
          },
          {
            enableHighAccuracy: true, // Use GPS when available
            timeout: 5000,            // Wait up to 5 seconds
            maximumAge: 0             // Don't use cached position
          }
        );
      } else {
        fallbackToGPRS();
      }
    };
    
    // Fallback to GPRS/Network-based location
    const fallbackToGPRS = async () => {
      try {
        // In a real app, you would use a service like ipapi.co or browser-based geolocation with low accuracy
        // Here we're simulating GPRS location with reduced accuracy
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        const gprsLocation = {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 1000, // GPRS typically has lower accuracy (~1000m)
          source: 'GPRS'
        };
        
        setCurrentLocation(gprsLocation);
        saveLiveLocation(gprsLocation);
      } catch (error) {
        console.error('GPRS fallback failed:', error);
      }
    };
    
    // Initial location fetch
    getGPSLocation();
    
    // Set up interval to update location every 10 seconds
    locationIntervalRef.current = setInterval(() => {
      getGPSLocation();
    }, 10000);
    
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [isTracking, conductor, isOnline, addOfflineData]);
  
  const contextValue = {
    currentLocation,
    isTracking,
    startTracking,
    stopTracking,
    setManualLocation
  };
  
  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
