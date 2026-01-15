export function IndexView() {
	return (
		<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 2rem;">
			<h1 style="color: #8b5cf6;">🎵 Eden Server API</h1>
			<p style="color: #6b7280; margin-bottom: 2rem;">
				A Spotify-like music streaming API built with Cloudflare Workers, D1,
				R2, and Hono
			</p>

			<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
				<h2 style="margin-top: 0; color: #374151;">Quick Links</h2>
				<ul style="line-height: 1.8;">
					<li>
						<a href="/scalar" style="color: #8b5cf6; text-decoration: none;">
							📚 API Documentation (Scalar UI)
						</a>
					</li>
					<li>
						<a href="/admin" style="color: #8b5cf6; text-decoration: none;">
							⚙️ Admin Panel
						</a>
					</li>
					<li>
						<a href="/health" style="color: #8b5cf6; text-decoration: none;">
							❤️ Health Check
						</a>
					</li>
				</ul>
			</div>

			<div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 1.5rem;">
				<h2 style="margin-top: 0; color: #0c4a6e;">Available Endpoints</h2>
				<ul style="line-height: 1.8; color: #374151;">
					<li>
						<strong>Artists:</strong> /api/artists
					</li>
					<li>
						<strong>Tracks:</strong> /api/tracks
					</li>
					<li>
						<strong>Uploads:</strong> /api/uploads
					</li>
				</ul>
			</div>
		</div>
	);
}
