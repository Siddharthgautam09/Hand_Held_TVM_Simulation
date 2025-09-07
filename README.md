# HTVM Simulation - Smart Handheld Ticket Vending Machine

## Overview
A comprehensive simulation of a Smart Handheld Ticket Vending Machine (HTVM) system built for Smart India Hackathon 2025. This end-to-end solution includes ticketing, GPS tracking with fallbacks, RFID pass validation, MQTT communication, and offline synchronization capabilities.

## Features
- 🎫 **Smart Ticketing**: Cash and UPI/Wallet payment simulation
- 📍 **GPS Tracking**: GPS → GPRS → Manual entry fallback system
- 🏷️ **RFID Pass Integration**: Contactless pass validation and discounted ticketing
- 📡 **MQTT Communication**: Real-time data synchronization
- 💾 **Offline Mode**: Local storage with automatic sync when online
- 📊 **Backend Dashboard**: Live bus tracking and revenue reports

## System Architecture

### Frontend (React)
- Conductor simulation interface
- Ticketing system with payment options
- GPS tracking and location management
- RFID pass validation
- Offline data storage (IndexedDB)
- MQTT client for real-time updates

### Backend (Node.js + Express)
- RESTful APIs for fare tables and pass validation
- MQTT subscriber for GPS and ticket events
- Database management (MongoDB/PostgreSQL)
- Authentication system for conductors
- Reports and analytics dashboard

### MQTT Broker
- Mosquitto/EMQX broker for pub/sub messaging
- Real-time location and ticket event streaming
- QoS 1 for guaranteed message delivery

## Project Structure
```
htvm-simulation/
├── frontend/          # React application
├── backend/           # Node.js Express server
├── mqtt-broker/       # MQTT broker configuration
└── docs/             # Documentation and API specs
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB or PostgreSQL
- MQTT Broker (Mosquitto/EMQX)

### Installation
1. Clone the repository
2. Install frontend dependencies: `cd frontend && npm install`
3. Install backend dependencies: `cd backend && npm install`
4. Configure environment variables
5. Start the services

### Development
```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm start

# Start MQTT broker
cd mqtt-broker && docker-compose up
```

## Sprint Progress
- [x] Sprint 1: Core Ticketing UI
- [x] Sprint 2: GPS Tracking Implementation
- [x] Sprint 3: RFID Pass Simulation
- [x] Sprint 4: Backend Integration
- [x] Sprint 5: Offline Sync Capabilities

## API Endpoints
- `POST /api/auth/login` - Conductor authentication
- `GET /api/fare-table` - Retrieve fare information
- `POST /api/pass/validate` - RFID pass validation
- `POST /api/tickets` - Create new ticket
- `GET /api/reports` - Generate analytics reports

## MQTT Topics
- `/bus/{BusID}/location` - GPS location updates
- `/bus/{BusID}/tickets` - Ticket transaction events
- `/system/sync` - Offline data synchronization

## Deployment
- **Frontend**: Vercel/Netlify
- **Backend**: Render/Heroku/Docker
- **Database**: MongoDB Atlas/PostgreSQL
- **MQTT**: EMQX Cloud/Self-hosted Mosquitto

## Contributing
This project is developed for Smart India Hackathon 2025. Please follow the sprint plan and acceptance criteria for feature development.

## License
MIT License - Created for educational and competition purposes.
