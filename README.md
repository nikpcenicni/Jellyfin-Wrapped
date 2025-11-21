# Jellyfin Wrapped

A beautiful single-page web application that displays server-wide statistics from your Jellyfin media server, excluding usernames for privacy. Built with Next.js, Tailwind CSS, and deployed via Docker.

## Features

- 🎬 Server-wide statistics display (no usernames)
- 📊 Top movies and TV shows
- 📅 Monthly activity overview
- ⏱️ Total watch time analytics
- 🔐 Login button for future personalized stats
- 🐳 Docker containerized deployment
- 🎨 Modern UI with Tailwind CSS

## Prerequisites

- Docker and Docker Compose (for containerized deployment)
- Jellyfin server with User Usage Stats plugin installed
- Jellyfin API key

## Quick Start with Docker

1. Clone this repository:
```bash
git clone <repository-url>
cd Jellyfin-Wrapped
```

2. Create a `.env` file (or copy from `.env.example`):
```bash
cp .env.example .env
```

3. Edit `.env` with your configuration:
```env
JELLYFIN_SERVER_URL=http://your-jellyfin-server:8096
JELLYFIN_API_KEY=your-api-key-here
OPENAI_API_KEY=your-openai-key-here  # Optional, for future features
TMDB_API_KEY=your-tmdb-api-key-here  # Optional, for poster images (get free at https://www.themoviedb.org/settings/api)
```

4. Build and run with Docker Compose:
```bash
docker-compose up -d
```

5. Open your browser to `http://localhost:3000`

## Development Setup

### Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install
```

### Run Development Servers

```bash
# From root directory - runs both frontend and backend
npm run dev

# Or run separately:
# Terminal 1: Backend API
npm run server

# Terminal 2: Next.js Frontend
npm run client
```

- Backend API: http://localhost:3000
- Next.js Frontend: http://localhost:3001 (proxies API calls to backend)

## Configuration

### Environment Variables

- `JELLYFIN_SERVER_URL` - Your Jellyfin server URL (required)
- `JELLYFIN_API_KEY` - Your Jellyfin API key (required)
- `OPENAI_API_KEY` - OpenAI API key (optional, for future enhancements)
- `TMDB_API_KEY` - TMDB (The Movie Database) API key (optional, for poster images - get free at https://www.themoviedb.org/settings/api)
- `PORT` - Backend server port (default: 3000)
- `API_URL` - API URL for Next.js rewrites (default: http://localhost:3000)

## Project Structure

```
├── client/                 # Next.js frontend application
│   ├── app/               # Next.js app directory (App Router)
│   │   ├── components/    # Next.js components
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Home page
│   └── package.json
├── server/                # Express backend API
│   └── index.js          # API server
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile            # Multi-stage Docker build
└── package.json          # Root package.json
```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/stats?year=2024` - Get server-wide statistics for a year
- `GET /api/stats/personal` - Get personalized stats (coming soon)
- `POST /api/login` - User login (coming soon)

## Future Enhancements

- User authentication and personalized statistics
- OpenAI integration for insights and recommendations
- Additional visualizations and charts
- Export statistics functionality

## License

MIT
