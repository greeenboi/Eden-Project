# R2 Setup Guide for AWS S3 Presigned URLs

## Overview
The Eden Server now uses AWS S3-compatible presigned URLs for secure, direct-to-R2 uploads. This allows clients to upload files directly to R2 without routing through Workers, saving bandwidth and costs.

## Required Secrets

You need to set the following secrets in your Cloudflare Worker:

### 1. R2 API Token (Access Key & Secret)

**Create an R2 API token:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** → **Overview**
3. Click **Manage R2 API Tokens**
4. Click **Create API Token**
5. Configure:
   - **Token name**: `eden-server-r2-access`
   - **Permissions**: 
     - ✅ Object Read & Write
     - ✅ Admin Read & Write (if you need bucket management)
   - **Bucket**: Select `eden-audio-storage` or leave as "All buckets"
6. Click **Create API Token**
7. Copy the **Access Key ID** and **Secret Access Key**

**Set the secrets:**

```bash
# Set R2 Access Key ID
wrangler secret put R2_ACCESS_KEY_ID
# Paste your Access Key ID when prompted

# Set R2 Secret Access Key
wrangler secret put R2_SECRET_ACCESS_KEY
# Paste your Secret Access Key when prompted
```

### 2. Cloudflare Account ID

**Find your Account ID:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Your Account ID is in the URL: `https://dash.cloudflare.com/ACCOUNT_ID_HERE/...`
3. Or go to **Workers & Pages** → right sidebar shows Account ID

**Set the secret:**

```bash
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# Paste your Account ID when prompted
```

### 3. R2 Public URL (Optional)

This is used for GET requests to stream/download files. You can use:
- Cloudflare's default: `https://pub-YOUR_ACCOUNT_ID.r2.dev`
- Or a custom domain if configured

**Set the secret:**

```bash
wrangler secret put R2_PUBLIC_URL
# Example: https://pub-abc123def456.r2.dev
```

### 4. Other Secrets (Already Set)

```bash
# JWT Secret (for authentication)
wrangler secret put JWT_SECRET

# R2 Signing Secret (legacy, used for custom signatures)
wrangler secret put R2_SIGNING_SECRET
```

## R2 Bucket CORS Configuration

For browser-based uploads to work, you need to configure CORS on your R2 bucket.

**Set CORS policy via API:**

```bash
curl -X PUT https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/r2/buckets/eden-audio-storage/cors \
  -H "Authorization: Bearer {R2_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "cors_rules": [
      {
        "allowed_origins": [
          "https://eden-server.suvan-gowrishanker-204.workers.dev",
          "http://localhost:5173",
          "http://localhost:3000"
        ],
        "allowed_methods": ["GET", "PUT", "POST"],
        "allowed_headers": ["*"],
        "expose_headers": ["ETag"],
        "max_age_seconds": 3600
      }
    ]
  }'
```

**Or via Wrangler (if supported):**

Create `r2-cors.json`:
```json
{
  "cors_rules": [
    {
      "allowed_origins": [
        "https://eden-server.suvan-gowrishanker-204.workers.dev",
        "http://localhost:5173"
      ],
      "allowed_methods": ["GET", "PUT", "POST"],
      "allowed_headers": ["*"],
      "expose_headers": ["ETag"],
      "max_age_seconds": 3600
    }
  ]
}
```

## Testing the Setup

1. **Deploy your Worker:**
   ```bash
   bun run deploy
   ```

2. **Test upload initiation:**
   ```bash
   curl -X POST https://eden-server.suvan-gowrishanker-204.workers.dev/api/uploads/initiate \
     -H "Content-Type: application/json" \
     -d '{
       "artistId": "test-artist-id",
       "filename": "test.mp3",
       "fileSize": 1048576,
       "mimeType": "audio/mpeg"
     }'
   ```

3. **You should receive a presigned URL** that looks like:
   ```
   https://abc123.r2.cloudflarestorage.com/eden-audio-storage/artist-id/originals/timestamp_file.mp3?X-Amz-Algorithm=...
   ```

4. **Test upload with the presigned URL:**
   ```bash
   curl -X PUT "{SIGNED_URL}" \
     -H "Content-Type: audio/mpeg" \
     --data-binary "@test.mp3"
   ```

## How It Works

1. **Client requests upload** → `/api/uploads/initiate`
2. **Worker generates AWS S3 presigned URL** using R2 credentials
3. **Client uploads directly to R2** using the presigned URL
4. **Client notifies completion** → `/api/uploads/:id/complete`
5. **Worker verifies object exists** and creates track record

## Security Benefits

- ✅ **Time-limited URLs** - Expire after 10 minutes
- ✅ **Method-specific** - Only PUT allowed for uploads
- ✅ **No proxy overhead** - Direct uploads save bandwidth
- ✅ **AWS Signature v4** - Industry-standard cryptographic signing
- ✅ **CORS-protected** - Only allowed origins can upload

## Troubleshooting

**"Access Denied" errors:**
- Check R2 API token has correct permissions
- Verify Account ID is correct
- Ensure bucket name matches

**CORS errors in browser:**
- Configure CORS policy on R2 bucket
- Check allowed origins include your frontend URL

**"Signature does not match" errors:**
- Verify R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are correct
- Check they haven't expired (tokens can be set to expire)

**URL format issues:**
- Ensure CLOUDFLARE_ACCOUNT_ID doesn't have extra spaces
- Check bucket name is exactly `eden-audio-storage`
