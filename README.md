# Jellyfin Wrapped

[![Build Status](https://github.com/nikpcenicni/Jellyfin-Wrapped/workflows/CI/badge.svg)](https://github.com/nikpcenicni/Jellyfin-Wrapped/actions)
[![Docker Hub](https://img.shields.io/docker/pulls/nikpcenicni/jellyfin-wrapped.svg)](https://hub.docker.com/r/nikpcenicni/jellyfin-wrapped)
[![License: GPL v2](https://img.shields.io/badge/License-GPL%20v2-blue.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html)

A beautiful single-page web application that displays server-wide statistics from your Jellyfin media server, excluding usernames for privacy. Built with Next.js, Tailwind CSS, and deployed via Docker.

## Table of Contents

- [Jellyfin Wrapped](#jellyfin-wrapped)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Screenshots](#screenshots)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Quick Start with Docker](#quick-start-with-docker)
    - [Manual Installation](#manual-installation)
  - [Configuration](#configuration)
    - [Environment Variables](#environment-variables)
    - [Docker Image Options](#docker-image-options)
  - [Development](#development)
    - [Development Setup](#development-setup)
    - [Project Structure](#project-structure)
    - [Running the Application](#running-the-application)
  - [API Documentation](#api-documentation)
    - [Health Check](#health-check)
    - [Statistics Endpoints](#statistics-endpoints)
    - [Authentication Endpoints](#authentication-endpoints)
    - [Other Endpoints](#other-endpoints)
  - [Contributing](#contributing)
    - [Development Guidelines](#development-guidelines)
  - [CI/CD](#cicd)
    - [Setting up GitHub Actions](#setting-up-github-actions)
    - [Pulling Images](#pulling-images)
  - [License](#license)

## Features

- 🎬 **Server-wide statistics display** - Aggregate statistics without exposing usernames
- 📊 **Top movies and TV shows** - Discover the most-watched content on your server
- 📅 **Monthly activity overview** - Track viewing patterns throughout the year
- ⏱️ **Total watch time analytics** - See cumulative viewing statistics
- 🌍 **Multi-language support** - Internationalization with next-intl
- 🔐 **User authentication** - Login functionality for future personalized stats
- 🐳 **Docker containerized deployment** - Easy deployment with Docker Compose
- 🎨 **Modern UI** - Beautiful, responsive design with Tailwind CSS and Framer Motion

## Screenshots

<!-- Screenshots coming soon -->

## Installation

### Prerequisites

- Docker and Docker Compose (for containerized deployment)
- Jellyfin server with User Usage Stats plugin installed
- Jellyfin API key (generate from your Jellyfin server settings)

### Quick Start with Docker

1. **Clone this repository:**
   ```bash
   git clone https://github.com/nikpcenicni/Jellyfin-Wrapped.git
   cd Jellyfin-Wrapped
   ```

2. **Create a `.env` file:**
   ```bash
   cp example.env .env
   ```

3. **Edit `.env` with your configuration:**
   ```env
   JELLYFIN_SERVER_URL=http://your-jellyfin-server:8096
   JELLYFIN_API_KEY=your-api-key-here
   OPENAI_API_KEY=your-openai-key-here  # Optional, for future features
   TMDB_API_KEY=your-tmdb-api-key-here  # Optional, for poster images
   ```

4. **Build and run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

5. **Access the application:**
   Open your browser to `http://localhost:3000`

### Manual Installation

If you prefer to run without Docker:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp example.env .env
   # Edit .env with your configuration
   ```

3. **Build the application:**
   ```bash
   npm run build
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `JELLYFIN_SERVER_URL` | Yes | Your Jellyfin server URL | - |
| `JELLYFIN_API_KEY` | Yes | Your Jellyfin API key | - |
| `OPENAI_API_KEY` | No | OpenAI API key for future enhancements | - |
| `TMDB_API_KEY` | No | TMDB API key for poster images ([Get free key](https://www.themoviedb.org/settings/api)) | - |

### Docker Image Options

The application is available from multiple registries:

**GitHub Container Registry (Recommended):**
```bash
docker pull ghcr.io/nikpcenicni/jellyfin-wrapped:latest
```

**Docker Hub:**
```bash
docker pull nikpcenicni/jellyfin-wrapped:latest
```

Update `docker-compose.yml` to use your preferred image source.

## Development

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nikpcenicni/Jellyfin-Wrapped.git
   cd Jellyfin-Wrapped
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp example.env .env
   # Edit .env with your development configuration
   ```

4. **Run development servers:**
   ```bash
   # Run both frontend and backend concurrently
   npm run dev

   # Or run separately:
   # Terminal 1: Backend API
   npm run server

   # Terminal 2: Next.js Frontend
   npm run client
   ```

5. **Access the application:**
   - Backend API: http://localhost:3000
   - Next.js Frontend: http://localhost:3001 (proxies API calls to backend)

### Project Structure

```
Jellyfin-Wrapped/
├── app/                      # Next.js frontend (App Router)
│   ├── components/          # React components
│   │   ├── ComingSoon.tsx
│   │   ├── LanguageSelector.tsx
│   │   ├── LoginButton.tsx
│   │   ├── MediaList.tsx
│   │   ├── MediaSection.tsx
│   │   ├── PodiumDisplay.tsx
│   │   ├── StatsDisplay.tsx
│   │   ├── TotalWatchTimeCard.tsx
│   │   ├── UserRanking.tsx
│   │   ├── WrappedExperience.tsx
│   │   └── utils.ts
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── providers.tsx        # React providers
│
├── server/                   # Express backend API
│   ├── config/              # Configuration
│   │   └── index.js
│   ├── routes/              # API route handlers
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
├── public/                   # Static assets
│
├── data/                     # Data directory (for SQLite cache)
│
├── docker-compose.yml        # Docker Compose configuration
├── Dockerfile                # Multi-stage Docker build
├── docker-entrypoint.sh      # Docker entry script
├── nginx.conf                # Nginx configuration
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── postcss.config.js         # PostCSS configuration
└── package.json              # Dependencies (frontend + backend)
```

### Running the Application

**Development mode:**
```bash
npm run dev
```

**Production build:**
```bash
npm run build
npm start
```

**Linting:**
```bash
npm run lint
```

## API Documentation

### Health Check
- `GET /api/health` - Health check endpoint

### Statistics Endpoints
- `GET /api/stats/total-watch-time?year=2024` - Get total watch time statistics
- `GET /api/stats/top-movies?year=2024` - Get top movies
- `GET /api/stats/top-shows?year=2024` - Get top TV shows
- `GET /api/stats/monthly-activity?year=2024` - Get monthly activity
- `GET /api/stats/media-type-comparison?year=2024` - Get movies vs shows comparison
- `GET /api/stats/top-genres?year=2024` - Get top genres
- `GET /api/stats/top-movie-years?year=2024` - Get top movie production years
- `GET /api/stats/ranking?year=2024&userId=<userId>` - Get user ranking (requires authentication)

### Authentication Endpoints
- `POST /api/login` - User login
- `POST /api/quick-connect/initiate` - Initiate Quick Connect
- `GET /api/quick-connect/status?secret=<secret>` - Check Quick Connect status
- `POST /api/quick-connect/authenticate` - Authenticate with Quick Connect

### Other Endpoints
- `POST /api/wrapped/insights` - Generate wrapped insights (AI-powered)
- `GET /api/image?itemId=<id>` - Proxy for Jellyfin images

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. **Fork the repository**
2. **Create your feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Add comments for complex logic
- Update documentation as needed
- Test your changes thoroughly
- Ensure all linting passes (`npm run lint`)

## CI/CD

This project includes GitHub Actions workflows that automatically build and publish Docker images to both GitHub Container Registry (ghcr.io) and Docker Hub when you push to the `main` branch or create version tags.

### Setting up GitHub Actions

1. **Configure GitHub Secrets:**
   - Go to your repository Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `DOCKERHUB_USERNAME` - Your Docker Hub username
     - `DOCKERHUB_TOKEN` - Your Docker Hub access token ([create here](https://hub.docker.com/settings/security))
   
   Note: `GITHUB_TOKEN` is automatically provided by GitHub Actions and doesn't need to be configured.

2. **Image Locations:**
   - GitHub Container Registry: `ghcr.io/nikpcenicni/jellyfin-wrapped`
   - Docker Hub: `docker.io/nikpcenicni/jellyfin-wrapped`

3. **Tagging:**
   - Pushes to `main` branch create a `latest` tag
   - Version tags (e.g., `v1.0.0`) create semantic version tags
   - Pull requests build the image but don't push to registries

### Pulling Images

```bash
# From GitHub Container Registry
docker pull ghcr.io/nikpcenicni/jellyfin-wrapped:latest

# From Docker Hub
docker pull nikpcenicni/jellyfin-wrapped:latest
```

## License

This project is licensed under the GNU General Public License v2.0 (GPL-2.0) - the same license as Jellyfin. See the [LICENSE](LICENSE) file for details.
