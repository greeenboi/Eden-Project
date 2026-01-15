/**
 * Eden Server Admin UI
 * Client-side JavaScript for managing artists and uploading tracks
 */

// Types
interface Artist {
	id: string;
	name: string;
	email: string;
	profile: string | null;
	bio: string | null;
	avatarUrl: string | null;
	verified: boolean;
	createdAt: string;
	updatedAt: string;
}

interface UploadSession {
	uploadId: string;
	signedUrl: string;
	expiresAt: string;
	expiresIn: number;
}

// State
let artists: Artist[] = [];
let selectedArtist: Artist | null = null;
let currentUpload: {
	uploadId: string;
	file: File;
} | null = null;

// API Base URL
const API_BASE = "https://eden-server.suvan-gowrishanker-204.workers.dev";

// Utility Functions
function showAlert(
	message: string,
	type: "success" | "error" | "info" = "info",
) {
	const container = document.getElementById("alertContainer");
	if (!container) return;

	const alert = document.createElement("div");
	alert.className = `alert alert-${type}`;
	alert.innerHTML = `
    <span>${type === "success" ? "✓" : type === "error" ? "✗" : "ℹ"}</span>
    <span>${message}</span>
  `;
	container.appendChild(alert);

	setTimeout(() => {
		alert.remove();
	}, 5000);
}

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((word) => word[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

// Tab Switching
function initTabs() {
	const tabs = document.querySelectorAll(".tab");
	const contents = document.querySelectorAll(".tab-content");

	// biome-ignore lint/complexity/noForEach: <explanation>
	tabs.forEach((tab: Element) => {
		tab.addEventListener("click", () => {
			const targetId = tab.getAttribute("data-tab");
			if (!targetId) return;

			// Update active tab
			// biome-ignore lint/complexity/noForEach: <explanation>
			tabs.forEach((t: Element) => t.classList.remove("active"));
			tab.classList.add("active");

			// Show target content
			// biome-ignore lint/complexity/noForEach: <explanation>
			contents.forEach((content: Element) => {
				if (content.id === targetId) {
					content.classList.add("active");
				} else {
					content.classList.remove("active");
				}
			});

			// Load data if needed
			if (targetId === "artists") {
				loadArtists();
			} else if (targetId === "upload-track") {
				loadArtistsForUpload();
			}
		});
	});
}

// Artist Management
async function loadArtists() {
	try {
		const response = await fetch(`${API_BASE}/api/artists?limit=50`);
		if (!response.ok) throw new Error("Failed to load artists");

		const data = (await response.json()) as { artists: Artist[] };
		artists = data.artists;

		renderArtistsList();
	} catch (error) {
		showAlert(`Failed to load artists: ${(error as Error).message}`, "error");
	}
}

function renderArtistsList() {
	const container = document.getElementById("artistsList");
	if (!container) return;

	if (artists.length === 0) {
		container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👤</div>
        <h3>No Artists Yet</h3>
        <p>Create your first artist to get started</p>
      </div>
    `;
		return;
	}

	container.innerHTML = `
    <div class="artist-list">
      ${artists
				.map(
					(artist) => `
        <div class="artist-item">
          <div class="artist-avatar"><img src="${artist.avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" /></div>
          <div class="artist-info">
            <div class="artist-name">${artist.name}</div>
            <div class="artist-email">${artist.email}</div>
          </div>
          ${artist.verified ? '<span class="artist-badge">✓ Verified</span>' : ""}
        </div>
      `,
				)
				.join("")}
    </div>
  `;
}

async function loadArtistsForUpload() {
	try {
		const response = await fetch(`${API_BASE}/api/artists?limit=100`);
		if (!response.ok) throw new Error("Failed to load artists");

		const data = (await response.json()) as { artists: Artist[] };
		artists = data.artists;

		const select = document.getElementById(
			"selectedArtist",
		) as unknown as HTMLSelectElement;
		if (!select) return;

		if (artists.length === 0) {
			select.innerHTML =
				'<option value="">No artists available - create one first</option>';
			return;
		}

		select.innerHTML = `
      <option value="">-- Select an artist --</option>
      ${artists
				.map(
					(artist) => `
        <option value="${artist.id}">${artist.name}</option>
      `,
				)
				.join("")}
    `;

		select.addEventListener("change", (e: Event) => {
			const artistId = (e.target as HTMLSelectElement).value;
			if (artistId) {
				selectedArtist = artists.find((a) => a.id === artistId) || null;
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				document.getElementById("track-upload-form")!.style.display = "block";
			} else {
				selectedArtist = null;
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				document.getElementById("track-upload-form")!.style.display = "none";
			}
		});
	} catch (error) {
		showAlert(`Failed to load artists: ${(error as Error).message}`, "error");
	}
}

// Create Artist Form
function initCreateArtistForm() {
	const form = document.getElementById("createArtistForm") as HTMLFormElement;
	if (!form) return;

	form.addEventListener("submit", async (e: Event) => {
		e.preventDefault();

		const formData = new FormData(form);
		const data = {
			name: formData.get("name") as string,
			email: formData.get("email") as string,
			profile: (formData.get("profile") as string) || undefined,
			bio: (formData.get("bio") as string) || undefined,
			avatarUrl: (formData.get("avatarUrl") as string) || undefined,
		};

		const submitBtn = form.querySelector(
			'button[type="submit"]',
		) as HTMLButtonElement;
		submitBtn.disabled = true;
		submitBtn.innerHTML = '<span class="spinner"></span> Creating...';

		try {
			const response = await fetch(`${API_BASE}/api/artists`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { message?: string };
				throw new Error(errorData.message || "Failed to create artist");
			}

			const artist = (await response.json()) as Artist;
			showAlert(`Artist "${artist.name}" created successfully!`, "success");
			form.reset();

			// Reload artists list
			await loadArtists();
		} catch (error) {
			showAlert(`Error: ${(error as Error).message}`, "error");
		} finally {
			submitBtn.disabled = false;
			submitBtn.textContent = "Create Artist";
		}
	});
}

// File Upload
function initFileUpload() {
	const fileInput = document.getElementById("audioFile") as HTMLInputElement;
	const selectFileBtn = document.getElementById("selectFileBtn");

	if (!fileInput || !selectFileBtn) return;

	selectFileBtn.addEventListener("click", () => {
		fileInput.click();
	});

	fileInput.addEventListener("change", async (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		// Validate file type
		const allowedTypes = [
			"audio/mpeg",
			"audio/wav",
			"audio/flac",
			"audio/aac",
			"audio/ogg",
		];
		if (!allowedTypes.includes(file.type)) {
			showAlert(
				"Unsupported file type. Please upload MP3, WAV, FLAC, AAC, or OGG",
				"error",
			);
			return;
		}

		// Validate file size (100MB)
		const maxSize = 100 * 1024 * 1024;
		if (file.size > maxSize) {
			showAlert("File size exceeds 100MB limit", "error");
			return;
		}

		// Show selected file
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		document.getElementById("selectedFile")!.style.display = "block";
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		document.getElementById("fileName")!.textContent = file.name;
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		document.getElementById("fileSize")!.textContent = formatFileSize(
			file.size,
		);

		// Initiate upload
		await initiateUpload(file);
	});
}

async function initiateUpload(file: File) {
	if (!selectedArtist) {
		showAlert("Please select an artist first", "error");
		return;
	}

	try {
		showAlert("Initiating upload...", "info");

		// Step 1: Initiate upload
		const initResponse = await fetch(`${API_BASE}/api/uploads/initiate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				artistId: selectedArtist.id,
				filename: file.name,
				fileSize: file.size,
				mimeType: file.type,
			}),
		});

		if (!initResponse.ok) {
			const errorData = (await initResponse.json()) as { message?: string };
			throw new Error(errorData.message || "Failed to initiate upload");
		}

		const uploadSession: UploadSession = await initResponse.json();
		currentUpload = {
			uploadId: uploadSession.uploadId,
			file: file,
		};

		showAlert("Upload session created. Uploading file to R2...", "info");

		// Step 2: Upload to R2
		await uploadToR2(file, uploadSession.signedUrl);

		// Step 3: Show metadata form
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		document.getElementById("metadataForm")!.style.display = "block";
		showAlert("File uploaded successfully! Now add track metadata.", "success");
	} catch (error) {
		showAlert(`Upload failed: ${(error as Error).message}`, "error");
		currentUpload = null;
	}
}

async function uploadToR2(file: File, signedUrl: string) {
	return new Promise<void>((resolve, reject) => {
		const xhr = new XMLHttpRequest();

		// Progress tracking
		xhr.upload.addEventListener("progress", (e) => {
			if (e.lengthComputable) {
				const percent = Math.round((e.loaded / e.total) * 100);
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				document.getElementById("uploadProgress")!.style.display = "block";
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				document.getElementById("progressPercent")!.textContent = `${percent}%`;
				const progressFill = document.getElementById(
					"progressFill",
				) as HTMLElement;
				progressFill.style.width = `${percent}%`;
			}
		});

		xhr.addEventListener("load", () => {
			if (xhr.status === 200) {
				resolve();
			} else {
				reject(new Error(`Upload failed with status ${xhr.status}`));
			}
		});

		xhr.addEventListener("error", () => {
			reject(new Error("Network error during upload"));
		});

		xhr.open("PUT", signedUrl);
		xhr.setRequestHeader("Content-Type", file.type);
		xhr.send(file);
	});
}

// Track Metadata Form
function initTrackMetadataForm() {
	const form = document.getElementById("trackMetadataForm") as HTMLFormElement;
	if (!form) return;

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		if (!currentUpload) {
			showAlert("No active upload session", "error");
			return;
		}

		const formData = new FormData(form);
		const metadata = {
			title: formData.get("title") as string,
			duration: formData.get("duration")
				? Number.parseInt(formData.get("duration") as string)
				: undefined,
			genre: (formData.get("genre") as string) || undefined,
			isrc: (formData.get("isrc") as string) || undefined,
			explicit: formData.get("explicit") === "on",
		};

		const submitBtn = form.querySelector(
			'button[type="submit"]',
		) as HTMLButtonElement;
		submitBtn.disabled = true;
		submitBtn.innerHTML = '<span class="spinner"></span> Creating track...';

		try {
			const response = await fetch(
				`${API_BASE}/api/uploads/${currentUpload.uploadId}/complete`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ trackMetadata: metadata }),
				},
			);

			if (!response.ok) {
				const errorData = (await response.json()) as { message?: string };
				throw new Error(errorData.message || "Failed to complete upload");
			}

			const result = (await response.json()) as { trackId: string };
			showAlert(
				`Track "${metadata.title}" created successfully! Track ID: ${result.trackId}`,
				"success",
			);

			// Reset form
			form.reset();
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			document.getElementById("metadataForm")!.style.display = "none";
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			document.getElementById("uploadProgress")!.style.display = "none";
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			document.getElementById("selectedFile")!.style.display = "none";
			currentUpload = null;

			// Reset file input
			const fileInput = document.getElementById(
				"audioFile",
			) as HTMLInputElement;
			if (fileInput) fileInput.value = "";
		} catch (error) {
			showAlert(`Error: ${(error as Error).message}`, "error");
		} finally {
			submitBtn.disabled = false;
			submitBtn.textContent = "Complete Upload & Create Track";
		}
	});
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
	initTabs();
	initCreateArtistForm();
	initFileUpload();
	initTrackMetadataForm();

	// Load initial data
	loadArtists();
});
