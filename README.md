# Easy Com

A full-stack e-commerce application built with Next.js (Frontend) and Express + Node.js (Backend).

---

## 🏗 Project Architecture

```
easy_com/
├── backend/                  # Node.js + Express + TypeScript API
│   ├── src/                  # Source code (routes, controllers, models, etc.)
│   ├── docs/                 # API and flow documentation
│   ├── Dockerfile.backend    # Docker config for Backend
│   ├── Dockerfile.nginx      # Nginx config for Backend proxy
│   └── docker-compose.yml    # Docker Compose setup for Backend
│
└── frontend/                 # Next.js 16 + React 19 + Redux Toolkit App
    ├── src/                  # Source code (app routes, components, store, etc.)
    ├── public/               # Static assets
    └── docker-compose.yml    # Docker Compose setup for Frontend
```

---

## 🛠 Tech Stack

### Frontend (`/frontend`)
- **Framework**: Next.js 16 (App Router)
- **UI & Styling**: React 19, Tailwind CSS v4
- **State Management**: Redux Toolkit (`@reduxjs/toolkit`, `react-redux`)
- **Services**: Firebase (`firebase`)

### Backend (`/backend`)
- **Runtime & Framework**: Node.js, Express 5, TypeScript
- **Authentication & Database**: Firebase Admin (`firebase-admin`)
- **Payment Processing**: Stripe (`stripe`)
- **Testing**: Jest, `ts-jest`
- **Infrastructure**: Docker & Nginx

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm / yarn / pnpm
- Docker & Docker Compose (optional, for containerized environment)

---

### Running the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run development server (uses native TypeScript stripping & watch mode):
   ```bash
   npm run dev
   ```
4. Other available scripts:
   - `npm run build` - Compile TypeScript to `dist/`
   - `npm run start` - Start production server (`node dist/index.js`)
   - `npm run test` - Run Jest test suite

---

### Running the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run development server (runs on port `4321` by default):
   ```bash
   npm run dev
   ```
4. Other available scripts:
   - `npm run build` - Build production Next.js application
   - `npm run start` - Start production Next.js server
   - `npm run lint` - Run ESLint checks

---

## 🐳 Docker Setup

Both `frontend` and `backend` include `docker-compose.yml` configurations.

- **Backend Docker**:
  ```bash
  cd backend
  docker compose up --build
  ```
- **Frontend Docker**:
  ```bash
  cd frontend
  docker compose up --build
  ```
