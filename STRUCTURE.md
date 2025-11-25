# Project Structure

This is a monorepo-style structure with everything at the root level.

## Directory Layout

```
Jellyfin-Wrapped/
├── app/                      # Next.js frontend (App Router)
│   ├── components/          # React components
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── providers.tsx        # React providers
│
├── server/                   # Express backend API
│   ├── config/              # Configuration
│   │   └── index.js
│   ├── services/            # Business logic
│   │   ├── jellyfin/       # Jellyfin API services
│   │   │   ├── auth.js
│   │   │   ├── items.js
│   │   │   ├── queries.js
│   │   │   └── users.js
│   │   ├── images/         # Image handling
│   │   │   └── posters.js
│   │   ├── ai/             # AI/OpenAI services
│   │   │   └── openai.js
│   │   └── cache/          # Caching services
│   │       ├── database.js
│   │       └── sync.js
│   ├── routes/              # API route handlers
│   │   └── index.js
│   ├── utils/               # Utility functions
│   │   ├── queryBuilders.js
│   │   └── transform.js
│   └── index.js             # Server entry point
│
├── messages/                 # Internationalization files
│   ├── de.json              # German translations
│   ├── en.json              # English translations
│   ├── es.json              # Spanish translations
│   └── fr.json              # French translations
│
├── public/                   # Static assets (Next.js)
│
├── data/                     # Data directory (for SQLite cache)
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
├── example.env               # Example environment variables template
├── LICENSE                   # License file (GPL v2)
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
  - `jellyfin/` - Jellyfin API integration (auth, items, queries, users)
  - `images/` - Image handling and poster fetching
  - `ai/` - OpenAI integration for wrapped insights
  - `cache/` - SQLite caching and sync services
- `server/config/index.js` - Configuration management
- `server/utils/` - Utility functions (query builders, data transformation)

### Configuration
- `package.json` - Combined frontend + backend dependencies
- `Dockerfile` - Multi-stage Docker build
- `docker-compose.yml` - Docker Compose services
- `nginx.conf` - Nginx reverse proxy config
- `example.env` - Environment variables template

### Internationalization
- `messages/` - Translation files for multi-language support (de, en, es, fr)

### Data
- `data/` - SQLite cache database (excluded from git via .gitignore)

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

