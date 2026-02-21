# Community Kitchen - Frontend

A Vite + React PWA frontend for the Community Kitchen meal ordering system.

## Features

- **React Router** - Dual routing for resident flow (`/`) and admin dashboard (`/admin`)
- **API Layer** - Comprehensive API client with fetch-based calls to backend services
- **PWA Support** - Progressive Web App manifest and service worker for offline capabilities
- **Service Worker** - Static asset caching with network fallback
- **Environment Configuration** - Environment variables for API URL and admin secret

## Setup

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Copy `.env.example` to `.env.local` and configure values:
   ```bash
   cp .env.example .env.local
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server on `http://localhost:5173`:

```bash
npm run dev
```

### Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Environment Variables

Configure these in `.env.local`:

- `VITE_API_URL` - Backend API URL (default: `http://localhost:3001`)
- `VITE_ADMIN_SECRET` - Admin authentication secret (must match backend)

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.js          # API client with all endpoints
│   ├── pages/
│   │   ├── ResidentPage.jsx   # Resident order flow
│   │   └── AdminPage.jsx      # Admin dashboard
│   ├── components/            # Reusable components
│   ├── App.jsx                # Main router component
│   ├── App.css                # Global styles
│   └── main.jsx               # Entry point with SW registration
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   └── icons/                 # App icons (add your own)
├── index.html                 # HTML template
├── vite.config.js             # Vite configuration
├── package.json               # Dependencies
└── .env.example               # Environment template
```

## API Client

The `src/api/client.js` module provides these functions:

### Public Endpoints
- `getServiceDay()` - Get current service day info
- `getMenu()` - Get menu items
- `postOrder(orderData)` - Create new order
- `getOrder(trackingId)` - Get order status

### Admin Endpoints (requires `x-admin-secret` header)
- `getAdminOrders()` - Get all orders
- `patchOrderStatus(orderId, status)` - Update order status
- `getAdminSummary()` - Get dashboard summary
- `getAdminServiceDay()` - Get service day settings
- `patchAdminServiceDay(data)` - Update service day settings

## PWA & Service Worker

The app is configured as a Progressive Web App:

1. **Manifest** (`manifest.json`) - Defines app metadata, icons, and shortcuts
2. **Service Worker** (`sw.js`) - Handles:
   - Static asset caching (cache-first strategy)
   - API calls (network-first strategy)
   - Offline fallback responses

To test PWA features:
- Install app from browser (usually "Install app" option)
- Test offline mode by disabling network in DevTools

## Adding Icons

Add your app icons to `public/`:
- `icon-192x192.png` - Standard icon (192x192)
- `icon-512x512.png` - Large icon (512x512)
- `icon-192x192-maskable.png` - Maskable variant
- `icon-512x512-maskable.png` - Maskable variant
- `screenshot-1.png` - Portrait app screenshot (540x720)
- `screenshot-2.png` - Wide app screenshot (1280x720)

Update `manifest.json` icon paths as needed.

## Notes

- The API client automatically adds the `x-admin-secret` header for admin endpoints
- Service worker skips caching for API calls to ensure fresh data
- The app registers the service worker on page load
- All environment variables are prefixed with `VITE_` for Vite's configuration
