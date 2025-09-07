import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Ticket, Location, OfflineData } from '../types';

interface OfflineDB extends DBSchema {
  tickets: {
    key: string;
    value: Ticket;
  };
  locations: {
    key: string;
    value: Location;
  };
  sync: {
    key: string;
    value: { lastSync: string };
  };
}

interface OfflineContextType {
  isOnline: boolean;
  saveTicketOffline: (ticket: Ticket) => Promise<void>;
  saveLocationOffline: (location: Location) => Promise<void>;
  syncOfflineData: () => Promise<void>;
  getOfflineData: () => Promise<OfflineData>;
  clearOfflineData: () => Promise<void>;
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
      const database = await openDB<OfflineDB>('HTVMOfflineDB', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('tickets')) {
            db.createObjectStore('tickets', { keyPath: 'TicketID' });
          }
          if (!db.objectStoreNames.contains('locations')) {
            db.createObjectStore('locations', { keyPath: 'timestamp' });
          }
          if (!db.objectStoreNames.contains('sync')) {
            db.createObjectStore('sync', { keyPath: 'id' });
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

  const saveTicketOffline = async (ticket: Ticket) => {
    if (!db) return;
    try {
      await db.put('tickets', ticket);
      console.log('Ticket saved offline:', ticket.TicketID);
    } catch (error) {
      console.error('Error saving ticket offline:', error);
    }
  };

  const saveLocationOffline = async (location: Location) => {
    if (!db) return;
    try {
      await db.put('locations', location);
      console.log('Location saved offline:', location.timestamp);
    } catch (error) {
      console.error('Error saving location offline:', error);
    }
  };

  const getOfflineData = async (): Promise<OfflineData> => {
    if (!db) return { tickets: [], locations: [], lastSync: '' };

    try {
      const tickets = await db.getAll('tickets');
      const locations = await db.getAll('locations');
      const syncData = await db.get('sync', 'lastSync');
      
      return {
        tickets,
        locations,
        lastSync: syncData?.lastSync || ''
      };
    } catch (error) {
      console.error('Error getting offline data:', error);
      return { tickets: [], locations: [], lastSync: '' };
    }
  };

  const syncOfflineData = async () => {
    if (!db || !isOnline) return;

    try {
      const offlineData = await getOfflineData();
      
      // Sync tickets
      for (const ticket of offlineData.tickets) {
        try {
          const response = await fetch('http://localhost:6001/api/tickets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(ticket),
          });
          
          if (response.ok) {
            await db.delete('tickets', ticket.TicketID);
            console.log('Ticket synced:', ticket.TicketID);
          }
        } catch (error) {
          console.error('Error syncing ticket:', error);
        }
      }

      // Sync locations
      for (const location of offlineData.locations) {
        try {
          const response = await fetch('/api/locations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(location),
          });
          
          if (response.ok) {
            await db.delete('locations', location.timestamp);
            console.log('Location synced:', location.timestamp);
          }
        } catch (error) {
          console.error('Error syncing location:', error);
        }
      }

      // Update last sync time
      await db.put('sync', { lastSync: new Date().toISOString() }, 'lastSync');
      
      console.log('Offline data sync completed');
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  };

  const clearOfflineData = async () => {
    if (!db) return;
    
    try {
      await db.clear('tickets');
      await db.clear('locations');
      console.log('Offline data cleared');
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
      saveTicketOffline,
      saveLocationOffline,
      syncOfflineData,
      getOfflineData,
      clearOfflineData
    }}>
      {children}
    </OfflineContext.Provider>
  );
};
