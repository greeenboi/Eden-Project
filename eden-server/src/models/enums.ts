/**
 * Enums and constants for the Eden Server API
 */

/**
 * User subscription tiers
 */
export const SubscriptionTier = {
  FREE: 'free',
  PREMIUM: 'premium',
  FAMILY: 'family',
  STUDENT: 'student',
} as const

export type SubscriptionTier = typeof SubscriptionTier[keyof typeof SubscriptionTier]

/**
 * Track status lifecycle
 * initiated -> uploaded -> processing -> published | failed
 */
export const TrackStatus = {
  INITIATED: 'initiated',
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  PUBLISHED: 'published',
  FAILED: 'failed',
} as const

export type TrackStatus = typeof TrackStatus[keyof typeof TrackStatus]

/**
 * Upload record status
 * initiated -> uploading -> completed -> processing | failed
 */
export const UploadStatus = {
  INITIATED: 'initiated',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PROCESSING: 'processing',
} as const

export type UploadStatus = typeof UploadStatus[keyof typeof UploadStatus]

/**
 * Audio encoding quality levels (bitrate)
 */
export const EncodingQuality = {
  LOW: '96kbps',
  MEDIUM: '160kbps',
  HIGH: '320kbps',
  LOSSLESS: 'flac',
} as const

export type EncodingQuality = typeof EncodingQuality[keyof typeof EncodingQuality]

/**
 * Supported audio MIME types
 */
export const AudioMimeType = {
  MP3: 'audio/mpeg',
  AAC: 'audio/aac',
  FLAC: 'audio/flac',
  WAV: 'audio/wav',
  OGG: 'audio/ogg',
} as const

export type AudioMimeType = typeof AudioMimeType[keyof typeof AudioMimeType]
