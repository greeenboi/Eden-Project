---
applyTo: 'eden-server/**/*.ts'
---

🎵 Eden Server - Spotify-like API Action Plan
Phase 1: Database Schema & Models (Foundation)
Task 1.1 - Create Drizzle schema for core metadata

Define users table (id, email, subscription_tier, region, device_limits, created_at)
Define artists table (id, name, profile, bio, created_at)
Define tracks table (id, artist_id, title, duration, r2_key_original, encodings JSON, status, published_at, created_at)
Define albums table (id, artist_id, title, release_date, artwork_url)
Define playlists tables (playlists + playlist_tracks junction)
Define upload_records table (id, artist_id, track_id, status, r2_key, signed_url_expires_at)
Task 1.2 - Create TypeScript models/types

Create models for each table with proper TypeScript types
Create DTOs (Data Transfer Objects) for API requests/responses
Create enums for status fields (track status, upload status, subscription tiers)
Phase 2: Core Infrastructure & Utilities (Lib Layer)
Task 2.1 - Database connection utilities

Create D1 database connection helper
Create Drizzle client initialization with proper bindings
Add connection validation utilities
Task 2.2 - R2 storage utilities

Create R2 bucket connection helper
Create signed URL generation utilities (PUT for uploads, GET for streaming)
Create R2 object key generation helpers (consistent naming patterns)
Task 2.3 - Authentication & authorization utilities

Create JWT validation middleware
Create session management helpers
Create role-based access control utilities (artist vs user)
Task 2.4 - Cache layer (KV) utilities

Create KV helpers for metadata caching
Create cache invalidation utilities
Create rate limiting helpers using KV
Phase 3: Services Layer (Business Logic)
Task 3.1 - Track service

CRUD operations for tracks
Metadata management
Status transitions (initiated → uploaded → processing → published)
Task 3.2 - Upload service

Upload initialization logic
Signed URL generation for R2 uploads
Upload completion validation
R2 object verification
Task 3.3 - Artist service

Artist profile management
Artist authentication
Quota checks for uploads
Task 3.4 - User service

User profile management
Subscription tier validation
Entitlement checks for streaming
Task 3.5 - Streaming service

Generate streaming signed URLs
Validate user entitlements
Track playback metrics
Phase 4: Controllers (Request Handlers)
Task 4.1 - Upload controller

Handle upload initiation requests
Handle upload completion callbacks
Handle upload status queries
Task 4.2 - Track controller

Handle track metadata CRUD
Handle track listing/search
Handle track publishing
Task 4.3 - Streaming controller

Handle stream URL generation
Handle playback events
Handle range request validation
Task 4.4 - Artist controller

Handle artist profile operations
Handle artist authentication
Phase 5: Routes & API Endpoints (OpenAPI Documentation)
Task 5.1 - Upload routes

POST /api/uploads/initiate - Initialize upload, get signed PUT URL
POST /api/uploads/:id/complete - Complete upload after client uploads to R2
GET /api/uploads/:id/status - Check upload processing status
Task 5.2 - Track routes

GET /api/tracks - List tracks (with filtering)
GET /api/tracks/:id - Get track metadata
GET /api/tracks/:id/stream - Get streaming URL
PATCH /api/tracks/:id - Update track metadata
DELETE /api/tracks/:id - Delete track
Task 5.3 - Artist routes

GET /api/artists/:id - Get artist profile
GET /api/artists/:id/tracks - List artist's tracks
PATCH /api/artists/:id - Update artist profile
Phase 6: Durable Objects Integration (Advanced State Management)
Task 6.1 - Upload session Durable Object

Create DO class for managing upload sessions
Handle multipart upload coordination
Maintain upload progress state
Task 6.2 - Transcoding queue Durable Object

Create DO class for managing transcoding jobs
Handle job queuing and status tracking
Coordinate with external transcoding services
Phase 7: Testing & Documentation
Task 7.1 - Add comprehensive OpenAPI documentation

Document all schemas with examples
Add authentication documentation
Add error response schemas
Task 7.2 - Update Scalar UI configuration

Configure authentication in Scalar
Add environment examples
📋 Immediate Starting Point
I recommend we start with Phase 1: Database Schema & Models, specifically:

TASK 1.1: Create Drizzle Schema
This includes creating the database tables in schema.ts for:

users - User accounts and subscriptions
artists - Artist profiles
tracks - Song metadata and R2 references
albums - Album information
playlists & playlist_tracks - Playlist management
upload_records - Upload tracking
TASK 1.2: Create TypeScript Models
This includes creating type-safe models in src/models/ for:

Type definitions from schema
DTOs for API requests/responses
Enums for statuses