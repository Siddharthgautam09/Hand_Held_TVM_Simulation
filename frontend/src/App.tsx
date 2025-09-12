import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TicketingApp from './components/TicketingApp';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider, useLocation } from './context/LocationContext';
import { MQTTProvider } from './context/MQTTContext';
import { OfflineProvider } from './context/OfflineContext';
import { useEffect } from 'react';

function App() {
  return (
    <Router>
      <AuthProvider>
        <OfflineProvider>
          <MQTTProvider>
            <LocationProvider>
              <MainApp />
            </LocationProvider>
          </MQTTProvider>
        </OfflineProvider>
      </AuthProvider>
    </Router>
  );
}

function MainApp() {
  const { isAuthenticated, conductor } = useAuth();
  const { startTracking, stopTracking } = useLocation();

  useEffect(() => {
    if (isAuthenticated && conductor) {
      // Start location tracking automatically when logged in
      startTracking();
    } else {
      stopTracking();
    }
  }, [isAuthenticated, conductor, startTracking, stopTracking]);

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <TicketingApp /> : <Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
