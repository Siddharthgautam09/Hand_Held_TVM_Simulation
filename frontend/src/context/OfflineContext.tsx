import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Ticket, Location, LiveLocation, OfflineData } from '../types';

interface OfflineDB extends DBSchema {
  tickets: {
    key: string;
    value: Ticket;
  };
  locations: {
    key: string;
    value: Location;
  };
  liveLocation: {
    key: string;
    value: LiveLocation;
  };
  sync: {
    key: string;
    value: { id: string, lastSync: string };
  };
}

type StoreName = 'tickets' | 'locations' | 'liveLocation';

interface OfflineContextType {
  isOnline: boolean;
  addOfflineData: (storeName: StoreName, data: any) => Promise<void>;
  syncOfflineData: () => Promise<void>;
  getOfflineData: () => Promise<OfflineData>;
  clearOfflineData: (storeName?: StoreName) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [db, setDb] = useState<IDBPDatabase<OfflineDB> | null>(null);

  useEffect(() => {
    const initDB = async () => {
      const database = await openDB<OfflineDB>('HTVMOfflineDB', 2, { // Incremented version to 2
        upgrade(db, oldVersion) {
          if (oldVersion < 1) {
            if (!db.objectStoreNames.contains('tickets')) {
              db.createObjectStore('tickets', { keyPath: 'TicketID' });
            }
            if (!db.objectStoreNames.contains('locations')) {
              db.createObjectStore('locations', { keyPath: 'timestamp' });
            }
            if (!db.objectStoreNames.contains('sync')) {
              db.createObjectStore('sync', { keyPath: 'id' });
            }
          }
          if (oldVersion < 2) {
            if (!db.objectStoreNames.contains('liveLocation')) {
              db.createObjectStore('liveLocation', { autoIncrement: true });
            }
          }
        },
      });
      setDb(database);
    };

    initDB();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addOfflineData = async (storeName: StoreName, data: any) => {
    if (!db) return;
    try {
      await db.put(storeName, data);
      console.log(`Data saved offline to ${storeName}:`, data);
    } catch (error) {
      console.error(`Error saving data offline to ${storeName}:`, error);
    }
  };

  const getOfflineData = async (): Promise<OfflineData> => {
    if (!db) return { tickets: [], locations: [], liveLocation: [], lastSync: '' };

    try {
      const tickets = await db.getAll('tickets');
      const locations = await db.getAll('locations');
      const liveLocation = await db.getAll('liveLocation');
      const syncData = await db.get('sync', 'lastSync');
      
      return {
        tickets,
        locations,
        liveLocation,
        lastSync: syncData?.lastSync || ''
      };
    } catch (error) {
      console.error('Error getting offline data:', error);
      return { tickets: [], locations: [], liveLocation: [], lastSync: '' };
    }
  };

  const syncOfflineData = async () => {
    if (!db || !isOnline) return;

    try {
      const offlineData = await getOfflineData();
      
      // Sync tickets
      if (offlineData.tickets.length > 0) {
        for (const ticket of offlineData.tickets) {
          try {
            const response = await fetch('/api/tickets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ticket),
            });
            if (response.ok) {
              await db.delete('tickets', ticket.TicketID);
            }
          } catch (error) {
            console.error('Error syncing ticket:', error);
          }
        }
      }

      // Sync locations (assuming this is for a different purpose than liveLocation)
      if (offlineData.locations.length > 0) {
        for (const location of offlineData.locations) {
          try {
            const response = await fetch('/api/locations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(location),
            });
            if (response.ok) {
              await db.delete('locations', location.timestamp);
            }
          } catch (error) {
            console.error('Error syncing location:', error);
          }
        }
      }

      // Sync live locations
      if (offlineData.liveLocation.length > 0) {
        try {
          const response = await fetch('/api/liveLocation/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locations: offlineData.liveLocation })
          });
          if (response.ok) {
            await db.clear('liveLocation');
          }
        } catch (error) {
          console.error('Failed to sync offline live locations:', error);
        }
      }

      // Update last sync time
      await db.put('sync', { id: 'lastSync', lastSync: new Date().toISOString() });
      
      console.log('Offline data sync completed');
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  };

  const clearOfflineData = async (storeName?: StoreName) => {
    if (!db) return;
    
    try {
      if (storeName) {
        await db.clear(storeName);
      } else {
        await db.clear('tickets');
        await db.clear('locations');
        await db.clear('liveLocation');
      }
      console.log('Offline data cleared for:', storeName || 'all stores');
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  };

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    }
  }, [isOnline]);

  return (
    <OfflineContext.Provider value={{
      isOnline,
      addOfflineData,
      syncOfflineData,
      getOfflineData,
      clearOfflineData
    }}>
      {children}
    </OfflineContext.Provider>
  );
};
