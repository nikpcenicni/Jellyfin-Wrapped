# Project Structure

This is a monorepo-style structure with everything at the root level.

## Directory Layout

```
Jellyfin-Wrapped/
├── app/                      # Next.js frontend (App Router)
│   ├── components/          # React components
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
│
├── server/                   # Express backend API
│   ├── config/              # Configuration
│   │   └── index.js
│   ├── services/            # Business logic
│   │   ├── jellyfin/       # Jellyfin API services
│   │   ├── images/         # Image handling
│   │   └── ai/             # AI/OpenAI services
│   ├── routes/              # API route handlers
│   │   └── index.js
│   ├── middleware/          # Express middleware (if needed)
│   ├── utils/               # Utility functions
│   │   └── transform.js
│   └── index.js             # Server entry point
│
├── public/                   # Static assets (Next.js)
│
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── postcss.config.js         # PostCSS configuration
├── package.json              # Dependencies (frontend + backend)
│
├── Dockerfile                # Docker build configuration
├── docker-compose.yml        # Docker Compose configuration
├── docker-entrypoint.sh      # Docker entry script
├── nginx.conf                # Nginx configuration
│
└── README.md                 # Project documentation
```

## Key Files

### Frontend (Next.js)
- `app/` - Next.js App Router directory
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS config
- `tsconfig.json` - TypeScript config

### Backend (Express)
- `server/index.js` - Main server entry point
- `server/routes/index.js` - API route definitions
- `server/services/` - Business logic modules
- `server/config/index.js` - Configuration management

### Configuration
- `package.json` - Combined frontend + backend dependencies
- `Dockerfile` - Multi-stage Docker build
- `docker-compose.yml` - Docker Compose services
- `nginx.conf` - Nginx reverse proxy config

## Development

```bash
# Install dependencies (installs everything)
npm install

# Run both frontend and backend in development
npm run dev

# Or run separately:
npm run server  # Express API (port 3000)
npm run client  # Next.js frontend (port 3001)

# Build for production
npm run build

# Start production server
npm start
```

## Structure Benefits

1. **Monorepo Style** - Everything at root level, easy to navigate
2. **Clear Separation** - `app/` for frontend, `server/` for backend
3. **Shared Dependencies** - Single `package.json` for all dependencies
4. **Modular Backend** - Services, routes, and utilities organized
5. **Docker Ready** - All paths configured for containerization

