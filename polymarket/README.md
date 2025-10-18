# T2R4 Monorepo

A full-stack application with SolidJS client, Express/MongoDB server, and shared models organized as a monorepo.

## Tech Stack

### Client (Frontend)
- **Framework**: SolidJS - Reactive JavaScript library for building user interfaces
- **Styling**: Bootstrap 5 - CSS framework for responsive design and components
- **Build Tool**: Vite - Fast build tool and development server
- **Language**: TypeScript - For type safety and better developer experience

### Server (Backend)
- **Runtime**: Node.js - JavaScript runtime for server-side development
- **Framework**: Express.js - Web application framework for Node.js
- **Database**: MongoDB - NoSQL document database with Mongoose ODM
- **Language**: TypeScript - For type safety and scalability

## Project Structure

```
T2R4/
├── client/             # SolidJS frontend application
│   ├── src/           # Source code
│   ├── vite.config.ts # Vite configuration
│   └── package.json   # Client dependencies
├── server/            # Express.js API server with MongoDB
│   ├── src/          # Source code
│   └── package.json  # Server dependencies
├── shared/           # Shared TypeScript types and models
│   ├── src/         # Shared types
│   └── package.json # Shared dependencies
├── pinescript/      # Pine Script trading indicators
│   └── BTS-Levels/  # BTS Level indicator
├── polymarket/      # Polymarket related code
├── AGENT.md         # Tech stack documentation
└── README.md
```

## Workspaces

This project uses npm workspaces for managing the monorepo:

- **client**: SolidJS frontend application with Vite
- **server**: Express.js backend API server with MongoDB
- **shared**: Shared TypeScript types and models

## Development

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **MongoDB** - Database server (local installation or cloud instance)
- **npm** - Package manager

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Create server environment file
   echo "PORT=3001" > server/.env
   echo "MONGODB_URI=mongodb://localhost:27017/t2r4" >> server/.env
   ```

   Edit `server/.env` to configure your MongoDB connection:
   ```bash
   # For local MongoDB
   MONGODB_URI=mongodb://localhost:27017/t2r4

   # For MongoDB Atlas (cloud)
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/t2r4
   ```

3. **Start MongoDB:**
   - **Local**: `mongod` or use MongoDB Compass/Docker
   - **Cloud**: Ensure your Atlas cluster is running

### Development Scripts

```bash
# Run both client and server in development mode
npm run dev

# Run only client (SolidJS + Vite)
npm run dev:client

# Run only server (Express + MongoDB)
npm run dev:server

# Build all workspaces
npm run build

# Run tests across all workspaces
npm run test
```

## Project Components

### Client (`/client`)
- **Framework**: SolidJS 1.8 - Reactive UI library
- **Build Tool**: Vite 5 - Fast development server with HMR
- **Styling**: Bootstrap 5 - Responsive CSS framework
- **Language**: TypeScript - Type-safe development
- **Features**:
  - Reactive components with SolidJS
  - Responsive design with Bootstrap
  - Fast refresh development with Vite
  - Type-safe API communication

### Server (`/server`)
- **Framework**: Express.js 4.18 - Web application framework
- **Database**: MongoDB with Mongoose 8.0 - Document database with ODM
- **Language**: TypeScript - Type-safe server development
- **Features**:
  - RESTful API endpoints
  - MongoDB data persistence
  - CORS and security middleware
  - Type-safe request/response handling

### Shared (`/shared`)
- **Purpose**: Common TypeScript types, interfaces, and utilities
- **Usage**: Shared between client and server for type safety
- **Features**:
  - API response types
  - Database model interfaces
  - Shared constants and utilities

### Pine Script (`/pinescript`)
- **Purpose**: TradingView Pine Script indicators
- **Current**: BTS-Levels indicator for technical analysis

### Polymarket (`/polymarket`)
- **Purpose**: Polymarket integration and related functionality

## API Endpoints

The server provides the following REST API endpoints:

### Health Check
- `GET /api/health` - Server health status and database connection

### Market Data
- `GET /api/market` - Retrieve recent market data
- `POST /api/market` - Create new market data entry

Example API usage:
```bash
# Get market data
curl http://localhost:3001/api/market

# Add market data
curl -X POST http://localhost:3001/api/market \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTC", "price": 50000, "volume": 100}'
```

## Contributing

1. **Choose the appropriate workspace** for your changes:
   - `client/` for frontend SolidJS components
   - `server/` for backend API logic
   - `shared/` for type definitions and utilities

2. **Follow TypeScript conventions** and maintain type safety across workspaces

3. **Update shared types** in `/shared/src/` when making API changes

4. **Test changes** across affected workspaces before committing

## Development Workflow

### Adding New Features
1. Define types in `shared/src/`
2. Implement server endpoints in `server/src/`
3. Create client components in `client/src/`
4. Update this README with new features

### Code Organization
- **Client**: Feature-based components in `src/`
- **Server**: Route-based organization in `src/`
- **Shared**: Type-only exports for cross-platform usage

## Scripts Overview

### Root Scripts
- `npm run dev` - Start both client (Vite) and server concurrently
- `npm run dev:client` - Start only the SolidJS client with Vite
- `npm run dev:server` - Start only the Express server
- `npm run build` - Build all workspaces for production
- `npm run test` - Run tests across all workspaces

### Workspace-Specific Scripts
Each workspace has its own scripts defined in their `package.json`:
- **Client**: `vite`, `vite build`, `vite preview`
- **Server**: `tsx watch`, `tsc`, `node dist/`
- **Shared**: `tsc`, `tsc --watch`
