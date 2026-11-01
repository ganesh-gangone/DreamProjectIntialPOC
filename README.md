# Plan Ahead — Two-Sided Service Marketplace POC

An End-to-End (E2E) microservices Proof of Concept (POC) for **Plan Ahead**, a two-sided local service marketplace enabling real-time bidirectional price bargaining between Homeowners (Users) and Independent Service Providers (Workers), backed by milestone escrow protection and hyper-accessible UX.

## Architecture & Microservices

1. **`frontend-gateway` (`nginx:1.28-alpine-slim`)**:
   - Serves the accessible Web Application (`index.html`) featuring a Voice-to-Text job input, "Listen to Guide" audio assistant, Senior High-Contrast Mode, Live Negotiation Room, and Escrow Admin Hub.
   - Acts as an API Gateway reverse-proxying `/api/identity`, `/api/negotiation`, `/api/escrow`, and `/socket.io` WebSockets.
2. **`identity-service` (`node:22.14.0-alpine3.21` - Port `4001`)**:
   - Manages user and worker profiles, strict KYC status, Premium Trusted badges, and gamified worker tiers in PostgreSQL.
3. **`negotiation-service` (`node:22.14.0-alpine3.21` - Port `4002`)**:
   - Powers job creation, Promoted Listings pinning, and real-time bidirectional counter-offers via Socket.io, MongoDB, and Redis.
4. **`escrow-service` (`node:22.14.0-alpine3.21` - Port `4003`)**:
   - Manages escrow fund locks, flat-fee deductions, Before & After Proof-of-Work photo verification, and standard or instant Express Payouts in PostgreSQL and persistent volume storage.

## Persistent Docker Volumes

- `pg_escrow_data`: PostgreSQL relational data (Users, KYC, and Escrow Ledgers).
- `mongo_negotiation_data`: MongoDB document store (Job listings and Negotiation Room bid history).
- `redis_state_data`: Redis append-only state cache for active offers.
- `proof_media_data`: Shared persistent volume storing Before & After Proof-of-Work verification manifests.

## Quick Start (Local or AWS EC2)

### Prerequisites
- Docker Engine & Docker Compose V2 installed.

### Run the Application
```bash
docker compose up --build -d
```

### Verify Running Services
```bash
docker compose ps
```

### Access the Web App
- Open `http://localhost` (or `http://<YOUR_EC2_PUBLIC_IP>`) in your browser.

### Stop the Application
```bash
docker compose down
```
*(Add `-v` only if you wish to wipe the persistent database volumes.)*
