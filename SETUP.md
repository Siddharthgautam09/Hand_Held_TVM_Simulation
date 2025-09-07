# HTVM Simulation - Complete Setup

## Project Structure Created ✅

The HTVM (Handheld Ticket Vending Machine) simulation has been successfully scaffolded with:

### Frontend (React + TypeScript + Vite)
- ✅ React application with TypeScript
- ✅ MQTT client integration
- ✅ GPS tracking with fallback system
- ✅ RFID pass simulation
- ✅ Offline storage with IndexedDB
- ✅ Responsive UI with Tailwind CSS
- ✅ Context providers for state management

### Backend (Node.js + Express + MongoDB)
- ✅ Express REST API server
- ✅ MongoDB models and schemas
- ✅ MQTT service integration
- ✅ Authentication middleware
- ✅ Comprehensive route handlers
- ✅ Error handling and validation

### MQTT Broker (Mosquitto)
- ✅ Docker configuration
- ✅ WebSocket support for browsers
- ✅ Development-ready settings

## Key Features Implemented

### 🎫 Smart Ticketing System
- Multiple payment modes (Cash, UPI, Wallet)
- QR code generation for tickets
- Fare calculation based on route
- Ticket history and JSON export

### 📍 GPS Tracking with Fallbacks
- **Primary**: Browser GPS geolocation
- **Secondary**: GPRS simulation (network triangulation)
- **Last Resort**: Manual stop selection by conductor

### 🏷️ RFID Pass Integration
- Pass validation (online/offline)
- Discount calculations
- Pass types: Student, Senior, Disabled, Employee
- Usage tracking and statistics

### 📡 MQTT Real-time Communication
- Live GPS location publishing
- Ticket transaction events
- Offline message queuing
- QoS 1 guaranteed delivery

### 💾 Offline Capabilities
- IndexedDB for local ticket storage
- Location caching
- Automatic sync when online
- Cached RFID pass validation

### 📊 Backend Dashboard & Analytics
- Live bus tracking on maps
- Revenue analytics and reports
- Pass usage statistics
- Real-time system monitoring

## Next Steps to Run the Application

### 1. Install Dependencies
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Setup Environment
```bash
# Backend - copy and configure environment
cd backend
cp .env.example .env
# Edit .env with your MongoDB URL and other settings
```

### 3. Start Services
```bash
# Start MQTT Broker
cd mqtt-broker
docker-compose up -d

# Start Backend (terminal 1)
cd ../backend
npm run dev

# Start Frontend (terminal 2) 
cd ../frontend
npm run dev
```

### 4. Default Login Credentials
- **Username**: conductor001
- **Password**: demo123

## API Endpoints Available

- `POST /api/auth/login` - Conductor authentication
- `GET /api/tickets` - Retrieve tickets with filters
- `POST /api/tickets` - Create new ticket
- `POST /api/pass/validate` - Validate RFID pass
- `GET /api/reports/dashboard` - Dashboard analytics
- `GET /api/locations/live` - Live bus locations

## MQTT Topics

- `/bus/{BusID}/location` - GPS location updates every 10s
- `/bus/{BusID}/tickets` - Ticket transaction events
- `/system/sync` - Offline data synchronization

The system is ready for Smart India Hackathon 2025 demonstration and follows all the specified requirements including GPS fallback mechanisms, MQTT integration, offline capabilities, and comprehensive reporting.
