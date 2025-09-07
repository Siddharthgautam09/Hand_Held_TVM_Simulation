import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TicketingApp from './components/TicketingApp';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { MQTTProvider } from './context/MQTTContext';
import { OfflineProvider } from './context/OfflineContext';

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <MQTTProvider>
          <OfflineProvider>
            <Router>
              <div className="app">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/" element={<TicketingApp />} />
                </Routes>
              </div>
            </Router>
          </OfflineProvider>
        </MQTTProvider>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
