import React, { useState, useEffect } from 'react';
import { useMQTT } from '../context/MQTTContext';
import { useOffline } from '../context/OfflineContext';
import { Ticket, Location } from '../types';

interface DashboardStats {
  totalRevenue: number;
  totalTickets: number;
  passTickets: number;
  activeBuses: number;
}

const Dashboard: React.FC = () => {
  const { messages } = useMQTT();
  const { getOfflineData } = useOffline();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalTickets: 0,
    passTickets: 0,
    activeBuses: 0
  });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [busLocations, setBusLocations] = useState<{ [key: string]: Location }>({});

  useEffect(() => {
    // Process MQTT messages
    messages.forEach((message: any) => {
      if (message.topic.includes('/location')) {
        const locationData = message.payload as Location;
        setBusLocations((prev: { [key: string]: Location }) => ({
          ...prev,
          [locationData.BusID]: locationData
        }));
      } else if (message.topic.includes('/tickets')) {
        setTickets((prev: Ticket[]) => [...prev, message.payload]);
      }
    });
  }, [messages]);

  useEffect(() => {
    // Load offline data
    const loadOfflineData = async () => {
      try {
        const offlineData = await getOfflineData();
        setTickets((prev: Ticket[]) => [...prev, ...offlineData.tickets]);
      } catch (error) {
        console.error('Error loading offline data:', error);
      }
    };

    loadOfflineData();
  }, [getOfflineData]);

  useEffect(() => {
    // Calculate stats
    const totalRevenue = tickets.reduce((sum: number, ticket: Ticket) => sum + ticket.Fare, 0);
    const totalTickets = tickets.length;
    const passTickets = tickets.filter((t: Ticket) => t.PassID).length;
    const activeBuses = Object.keys(busLocations).length;

    setStats({
      totalRevenue,
      totalTickets,
      passTickets,
      activeBuses
    });
  }, [tickets, busLocations]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">HTVM Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">₹</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">₹{stats.totalRevenue.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">#</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Tickets</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalTickets}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pass Tickets</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.passTickets}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">B</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Buses</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.activeBuses}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Tickets</h3>
              <div className="space-y-3">
                {tickets.slice(-5).map((ticket: Ticket) => (
                  <div key={ticket.TicketID} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ticket.TicketID}</p>
                      <p className="text-sm text-gray-500">{ticket.Source} → {ticket.Destination}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">₹{ticket.Fare}</p>
                      <p className="text-sm text-gray-500">{ticket.PaymentMode}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Live Bus Locations</h3>
              <div className="space-y-3">
                {Object.entries(busLocations).map(([busId, location]) => (
                  <div key={busId} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Bus {busId}</p>
                      <p className="text-sm text-gray-500">Source: {location.source}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(location.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
