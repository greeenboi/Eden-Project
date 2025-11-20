export function AdminView() {
  return (
    <div class="container">
      <div class="header">
        <h1>🎵 Eden Server Admin</h1>
        <p>Manage artists, upload tracks, and monitor your music streaming platform</p>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>Artist Management</h2>
        </div>
        
        <div class="tabs">
          <button type="button" class="tab active" data-tab="create-artist">Create Artist</button>
          <button type="button" class="tab" data-tab="upload-track">Upload Track</button>
          <button type="button" class="tab" data-tab="artists">View Artists</button>
        </div>

        <div id="create-artist" class="tab-content active">
          <form id="createArtistForm">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label required" htmlFor="artist-name">Artist Name</label>
                <input type="text" class="form-input" id="artist-name" name="name" required placeholder="Enter artist name" />
              </div>
              <div class="form-group">
                <label class="form-label required" htmlFor="artist-email">Email</label>
                <input type="email" class="form-input" id="artist-email" name="email" required placeholder="artist@example.com" />
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label" htmlFor="artist-profile">Short Bio</label>
              <input type="text" class="form-input" id="artist-profile" name="profile" placeholder="A short tagline or intro" />
            </div>
            
            <div class="form-group">
              <label class="form-label" htmlFor="artist-bio">Full Biography</label>
              <textarea class="form-textarea" id="artist-bio" name="bio" placeholder="Full artist biography" />
            </div>
            
            <div class="form-group">
              <label class="form-label" htmlFor="artist-avatar">Avatar URL</label>
              <input type="url" class="form-input" id="artist-avatar" name="avatarUrl" placeholder="https://example.com/avatar.jpg" />
              <span class="form-hint">Enter a URL to an image for the artist's avatar</span>
            </div>
            
            <button type="submit" class="btn btn-primary">Create Artist</button>
          </form>
        </div>

        <div id="upload-track" class="tab-content">
          <div id="artist-selector">
            <div class="form-group">
              <label class="form-label required" htmlFor="selectedArtist">Select Artist</label>
              <select class="form-select" id="selectedArtist" required>
                <option value="">Loading artists...</option>
              </select>
            </div>
          </div>

          <div id="track-upload-form" style="display: none;">
            <h3 style="margin-bottom: 1rem;">Step 1: Audio File</h3>
            <div class="upload-section">
              <div class="upload-icon">🎵</div>
              <h3>Select Audio File</h3>
              <p style="margin-bottom: 1rem; color: var(--gray);">Supported formats: MP3, WAV, FLAC, AAC, OGG (Max 100MB)</p>
              <div class="file-input-wrapper">
                <button type="button" class="btn btn-primary" id="selectFileBtn">Choose File</button>
                <input type="file" id="audioFile" accept="audio/*" />
              </div>
              <div id="selectedFile" style="margin-top: 1rem; display: none;">
                <p style="font-weight: 500;"><span id="fileName" /> (<span id="fileSize" />)</p>
              </div>
            </div>

            <div id="uploadProgress" style="display: none; margin-top: 1rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>Uploading to R2...</span>
                <span id="progressPercent">0%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" id="progressFill" style="width: 0%" />
              </div>
            </div>

            <div id="metadataForm" style="display: none; margin-top: 2rem;">
              <h3 style="margin-bottom: 1rem;">Step 2: Track Metadata</h3>
              <form id="trackMetadataForm">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label required" htmlFor="track-title">Track Title</label>
                    <input type="text" class="form-input" id="track-title" name="title" required placeholder="Song title" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" htmlFor="track-duration">Duration (seconds)</label>
                    <input type="number" class="form-input" id="track-duration" name="duration" placeholder="180" />
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" htmlFor="track-genre">Genre</label>
                    <input type="text" class="form-input" id="track-genre" name="genre" placeholder="Rock, Pop, Jazz, etc." />
                  </div>
                  <div class="form-group">
                    <label class="form-label" htmlFor="track-isrc">ISRC Code</label>
                    <input type="text" class="form-input" id="track-isrc" name="isrc" placeholder="US-XXX-XX-XXXXX" />
                  </div>
                </div>
                
                <div class="form-group">
                  <label htmlFor="track-explicit" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="track-explicit" name="explicit" />
                    <span>Explicit Content</span>
                  </label>
                </div>
                
                <button type="submit" class="btn btn-success">Complete Upload & Create Track</button>
              </form>
            </div>
          </div>
        </div>

        <div id="artists" class="tab-content">
          <div id="artistsList" />
        </div>
      </div>

      <div id="alertContainer" />
    </div>
  )
}
