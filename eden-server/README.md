# 🎵 Eden Server

A Spotify-like music streaming platform API built on Cloudflare's edge stack.

## Architecture

- **Cloudflare Workers**: Serverless compute at the edge
- **D1 Database**: Relational metadata storage (SQLite with Drizzle ORM)
- **R2 Storage**: Scalable audio file object storage
- **KV Namespace**: Caching and rate limiting
- **Hono + OpenAPI**: Type-safe routing with automatic documentation

## Features

### 🎵 Track Management
- CRUD operations for track metadata
- Search tracks by title, artist, or album
- List and filter tracks with pagination
- Automatic R2 cleanup on deletion
- Support for multiple encoding qualities (96kbps, 160kbps, 320kbps, FLAC)

### 📤 Upload Management
- Initialize file uploads with signed R2 URLs
- Direct-to-R2 upload (no worker bandwidth usage)
- Complete upload workflow with automatic track creation
- Track upload status and processing
- Support for multiple audio formats (MP3, WAV, FLAC, AAC, OGG)

### 📊 Status & Workflow
- Track status: `initiated` → `uploaded` → `processing` → `published` (or `failed`)
- Upload status tracking with detailed error messages
- Health check endpoint with database connectivity verification

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed automatically with dependencies)
- Cloudflare account with:
  - D1 database
  - R2 bucket
  - KV namespace

### Installation

```bash
npm install
```

### Configuration

1. **Update `wrangler.jsonc`** with your Cloudflare resource IDs:
   - `d1_databases[0].database_id`: Your D1 database ID
   - `kv_namespaces[0].id`: Your KV namespace ID
   - `r2_buckets[0].bucket_name`: Your R2 bucket name

2. **Set secrets** (required for production):
   ```bash
   # JWT secret for authentication
   npx wrangler secret put JWT_SECRET
   
   # R2 signing secret for generating signed URLs
   npx wrangler secret put R2_SIGNING_SECRET
   ```

3. **Generate TypeScript types** from Cloudflare bindings:
   ```bash
   npm run cf-typegen
   ```

### Database Setup

1. **Generate migration** (if schema changed):
   ```bash
   npx drizzle-kit generate
   ```

2. **Apply migrations** to D1:
   ```bash
   # Local (development)
   npx wrangler d1 migrations apply eden-db-main --local
   
   # Remote (production)
   npx wrangler d1 migrations apply eden-db-main --remote
   ```

### Development

```bash
npm run dev
```

The server will start at `http://localhost:5173`

**Available endpoints:**
- `http://localhost:5173/` - API information
- `http://localhost:5173/health` - Health check
- `http://localhost:5173/scalar` - Interactive API documentation
- `http://localhost:5173/doc` - OpenAPI spec (JSON)

### Deployment

```bash
npm run deploy
```

This will:
1. Build the project with Vite
2. Deploy to Cloudflare Workers

## API Documentation

### Interactive Docs

Visit `/scalar` for the full interactive API documentation with:
- All endpoints with request/response schemas
- Try-it-out functionality
- Authentication setup
- Example requests

### Key Endpoints

#### Uploads

- `POST /api/uploads/initiate` - Initialize upload and get signed PUT URL
- `POST /api/uploads/:id/complete` - Complete upload after file is uploaded to R2
- `GET /api/uploads/:id/status` - Check upload processing status
- `GET /api/artists/:artistId/uploads` - List uploads for an artist

#### Tracks

- `POST /api/tracks` - Create a new track (internal use)
- `GET /api/tracks/:id` - Get track metadata by ID
- `GET /api/tracks` - List tracks with filtering and pagination
- `PATCH /api/tracks/:id` - Update track metadata
- `DELETE /api/tracks/:id` - Delete track and associated R2 objects
- `GET /api/tracks/search` - Search tracks by title, artist, or album

## Project Structure

```
eden-server/
├── src/
│   ├── controllers/      # HTTP request handlers with OpenAPI definitions
│   ├── services/         # Business logic layer
│   ├── lib/              # Utilities (DB, R2, KV, errors)
│   ├── models/           # TypeScript types, DTOs, and Zod schemas
│   ├── routes/           # Route registration
│   ├── schema.ts         # Drizzle ORM schema definitions
│   └── index.tsx         # Main application entry point
├── drizzle/              # Database migrations
├── wrangler.jsonc        # Cloudflare Workers configuration
├── drizzle.config.ts     # Drizzle Kit configuration
└── package.json
```

## Development Workflow

### Typical Upload Flow

1. **Artist initiates upload:**
   ```bash
   POST /api/uploads/initiate
   {
     "artistId": "uuid",
     "filename": "song.mp3",
     "fileSize": 5242880,
     "mimeType": "audio/mpeg"
   }
   ```

2. **Client uploads to signed R2 URL** (direct PUT request)

3. **Artist completes upload:**
   ```bash
   POST /api/uploads/:id/complete
   {
     "trackMetadata": {
       "title": "My Song",
       "duration": 180
     }
   }
   ```

4. **Track is created and processing begins** (encoding, transcoding)

### Testing

```bash
# Run development server with local bindings
npm run dev

# Test with curl
curl http://localhost:5173/health

# Or use the Scalar UI at http://localhost:5173/scalar
```

## Environment Variables

Set via `wrangler secret put <NAME>` for production:

- `JWT_SECRET` - Secret key for JWT token signing/verification
- `R2_SIGNING_SECRET` - Secret key for R2 signed URL generation

## Rate Limits

- Upload initiation: 10 requests per minute per artist
- Other endpoints: 100 requests per minute per user

## Next Steps

- [ ] Implement artist authentication service
- [ ] Add streaming endpoint with signed URLs
- [ ] Implement transcoding service (background workers)
- [ ] Add playlist management endpoints
- [ ] Implement user management and subscriptions
- [ ] Add analytics and playback tracking
- [ ] Implement search with full-text indexing
- [ ] Add recommendation engine

## License

MIT

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Scalar API Reference](https://github.com/scalar/scalar)
