import React from 'react';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';

const LocationStatus: React.FC = () => {
  const { currentLocation, isTracking } = useLocation();
  const { conductor } = useAuth();

  if (!isTracking || !currentLocation) {
    return (
      <div className="bg-gray-100 p-2 rounded-md mt-2">
        <div className="flex items-center">
          <span className="text-lg mr-2">📍</span>
          <span>Location tracking disabled</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-2 rounded-md mt-2 ${
      currentLocation.source === 'GPS' ? 'bg-green-100' : 'bg-yellow-100'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-lg mr-2">
            {currentLocation.source === 'GPS' ? '🛰️' : '📶'}
          </span>
          <span className="font-medium">
            {currentLocation.source || 'Unknown'} 
            {currentLocation.accuracy && ` (±${Math.round(currentLocation.accuracy)}m)`}
          </span>
        </div>
        <div>
          <span className="text-xs">
            {conductor?.busId && `Bus: ${conductor.busId}`}
          </span>
        </div>
      </div>
      <div className="text-xs mt-1">
        {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
      </div>
    </div>
  );
};

export default LocationStatus;