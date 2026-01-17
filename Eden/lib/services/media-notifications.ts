import type { QueueTrack } from "@/lib/actions/queue";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Notification action identifiers
export const NOTIFICATION_ACTIONS = {
	PLAY: "media.play",
	PAUSE: "media.pause",
	NEXT: "media.next",
	PREVIOUS: "media.previous",
} as const;

// Notification category identifier
export const MEDIA_CATEGORY_ID = "media-controls";

// Notification channel ID (Android)
export const MEDIA_CHANNEL_ID = "media-playback";

// Persistent notification identifier
const MEDIA_NOTIFICATION_ID = "eden-media-player";

// Track setup state
let isSetupComplete = false;
let permissionsGranted = false;

export interface MediaNotificationState {
	track: QueueTrack;
	isPlaying: boolean;
	hasNext: boolean;
	hasPrevious: boolean;
}

/**
 * Initialize the notification handler for media controls.
 * Call this once at app startup.
 */
export function initializeMediaNotifications(): void {
	console.log("[MediaNotifications] Setting up notification handler");
	// Set notification handler to show notifications
	Notifications.setNotificationHandler({
		handleNotification: async (notification) => {
			const categoryId = notification.request.content.categoryIdentifier;
			const isMediaNotification = categoryId === MEDIA_CATEGORY_ID;
			console.log("[MediaNotifications] handleNotification called, isMedia:", isMediaNotification);

			return {
				shouldPlaySound: false,
				shouldSetBadge: false,
				// Show media notifications in the notification tray
				shouldShowBanner: true,
				shouldShowList: true,
			};
		},
	});
	console.log("[MediaNotifications] Notification handler configured");
}

/**
 * Set up the Android notification channel for media playback.
 * Should be called once at app startup.
 */
export async function setupMediaNotificationChannel(): Promise<void> {
	if (Platform.OS !== "android") {
		console.log("[MediaNotifications] Not Android, skipping channel setup");
		return;
	}

	console.log("[MediaNotifications] Setting up Android notification channel");
	try {
		const channel = await Notifications.setNotificationChannelAsync(MEDIA_CHANNEL_ID, {
			name: "Media Playback",
			description: "Controls for music playback",
			importance: Notifications.AndroidImportance.LOW,
			// Low importance = no sound, no vibration, but visible in shade
			lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
			enableVibrate: false,
			enableLights: false,
			showBadge: false,
		});
		console.log("[MediaNotifications] Channel created:", JSON.stringify(channel));
	} catch (error) {
		console.error("[MediaNotifications] Failed to create channel:", error);
	}
}

/**
 * Set up notification categories with media control actions.
 * This creates the interactive buttons (play/pause, next, previous).
 */
export async function setupMediaNotificationCategory(
	isPlaying: boolean,
): Promise<void> {
	console.log("[MediaNotifications] Setting up notification category, isPlaying:", isPlaying);
	const actions: Notifications.NotificationAction[] = [
		{
			identifier: NOTIFICATION_ACTIONS.PREVIOUS,
			buttonTitle: "⏮ Prev",
			options: {
				opensAppToForeground: false,
				isDestructive: false,
				isAuthenticationRequired: false,
			},
		},
		{
			identifier: isPlaying ? NOTIFICATION_ACTIONS.PAUSE : NOTIFICATION_ACTIONS.PLAY,
			buttonTitle: isPlaying ? "⏸ Pause" : "▶ Play",
			options: {
				opensAppToForeground: false,
				isDestructive: false,
				isAuthenticationRequired: false,
			},
		},
		{
			identifier: NOTIFICATION_ACTIONS.NEXT,
			buttonTitle: "⏭ Next",
			options: {
				opensAppToForeground: false,
				isDestructive: false,
				isAuthenticationRequired: false,
			},
		},
	];

	try {
		const category = await Notifications.setNotificationCategoryAsync(MEDIA_CATEGORY_ID, actions, {
			allowInCarPlay: true,
			showTitle: true,
			showSubtitle: true,
		});
		console.log("[MediaNotifications] Category created:", JSON.stringify(category));
	} catch (error) {
		console.error("[MediaNotifications] Failed to create category:", error);
	}
}

/**
 * Show or update the media playback notification with current track info.
 */
export async function showMediaNotification(
	state: MediaNotificationState,
): Promise<void> {
	const { track, isPlaying, hasNext, hasPrevious } = state;
	console.log("[MediaNotifications] showMediaNotification called");
	console.log("[MediaNotifications] - track:", track.title, "by", track.artistName);
	console.log("[MediaNotifications] - isPlaying:", isPlaying);
	console.log("[MediaNotifications] - isSetupComplete:", isSetupComplete);
	console.log("[MediaNotifications] - permissionsGranted:", permissionsGranted);

	if (!isSetupComplete) {
		console.warn("[MediaNotifications] Not set up yet, calling setup now");
		await setupMediaNotifications();
	}

	if (!permissionsGranted) {
		console.error("[MediaNotifications] Permissions not granted, cannot show notification");
		return;
	}

	// Update the category with current play/pause state
	await setupMediaNotificationCategory(isPlaying);

	// First dismiss any existing notification
	try {
		console.log("[MediaNotifications] Dismissing existing notification");
		await Notifications.dismissNotificationAsync(MEDIA_NOTIFICATION_ID);
	} catch (e) {
		// Ignore - might not exist
		console.log("[MediaNotifications] Dismiss result (may be normal):", e);
	}

	const notificationContent: Notifications.NotificationContentInput = {
		title: track.title,
		subtitle: track.artistName,
		body: isPlaying ? "▶ Now Playing" : "⏸ Paused",
		categoryIdentifier: MEDIA_CATEGORY_ID,
		data: {
			trackId: track.id,
			isPlaying,
			type: "media-control",
		},
		// Android specific
		sticky: true, // Can't be swiped away
		autoDismiss: false,
		priority: "low", // Low priority = no sound/vibration
	};

	console.log("[MediaNotifications] Notification content:", JSON.stringify(notificationContent));

	try {
		console.log("[MediaNotifications] Scheduling notification...");
		const identifier = await Notifications.scheduleNotificationAsync({
			identifier: MEDIA_NOTIFICATION_ID,
			content: notificationContent,
			trigger: null, // Immediate display
		});
		console.log("[MediaNotifications] Notification scheduled, id:", identifier);

		// Debug: Check what's shown
		await debugGetPresentedNotifications();
	} catch (error) {
		console.error("[MediaNotifications] Failed to schedule notification:", error);
	}
}

/**
 * Dismiss the media notification (when playback stops completely).
 */
export async function dismissMediaNotification(): Promise<void> {
	console.log("[MediaNotifications] dismissMediaNotification called");
	try {
		await Notifications.dismissNotificationAsync(MEDIA_NOTIFICATION_ID);
		console.log("[MediaNotifications] Notification dismissed");
	} catch (error) {
		console.log("[MediaNotifications] Dismiss error (may be normal):", error);
	}
}

/**
 * Request notification permissions if not already granted.
 * Returns true if permissions are granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
	console.log("[MediaNotifications] Requesting permissions");
	try {
		const { status: existingStatus } = await Notifications.getPermissionsAsync();
		console.log("[MediaNotifications] Existing status:", existingStatus);

		if (existingStatus === "granted") {
			console.log("[MediaNotifications] Already granted");
			return true;
		}

		console.log("[MediaNotifications] Requesting new permissions");
		const { status } = await Notifications.requestPermissionsAsync({
			ios: {
				allowAlert: true,
				allowBadge: false,
				allowSound: false,
			},
		});
		console.log("[MediaNotifications] New status:", status);

		return status === "granted";
	} catch (error) {
		console.error("[MediaNotifications] Permission request failed:", error);
		return false;
	}
}

/**
 * Add a listener for notification responses (button presses).
 * Returns a subscription that should be removed on cleanup.
 */
export function addMediaNotificationResponseListener(
	handler: (action: keyof typeof NOTIFICATION_ACTIONS) => void,
): Notifications.EventSubscription {
	console.log("[MediaNotifications] Adding response listener");
	return Notifications.addNotificationResponseReceivedListener((response) => {
		const { actionIdentifier } = response;
		const data = response.notification.request.content.data;
		console.log("[MediaNotifications] Response received, action:", actionIdentifier);
		console.log("[MediaNotifications] Response data:", JSON.stringify(data));

		// Only handle media control notifications
		if (data?.type !== "media-control") {
			console.log("[MediaNotifications] Not a media control, ignoring");
			return;
		}

		// Map action identifier to action type
		switch (actionIdentifier) {
			case NOTIFICATION_ACTIONS.PLAY:
				console.log("[MediaNotifications] PLAY action");
				handler("PLAY");
				break;
			case NOTIFICATION_ACTIONS.PAUSE:
				console.log("[MediaNotifications] PAUSE action");
				handler("PAUSE");
				break;
			case NOTIFICATION_ACTIONS.NEXT:
				console.log("[MediaNotifications] NEXT action");
				handler("NEXT");
				break;
			case NOTIFICATION_ACTIONS.PREVIOUS:
				console.log("[MediaNotifications] PREVIOUS action");
				handler("PREVIOUS");
				break;
			case Notifications.DEFAULT_ACTION_IDENTIFIER:
				console.log("[MediaNotifications] Default tap action");
				// User tapped on the notification itself - could open the player
				break;
			default:
				console.log("[MediaNotifications] Unknown action:", actionIdentifier);
		}
	});
}

/**
 * Debug: Get all presented notifications
 */
export async function debugGetPresentedNotifications(): Promise<void> {
	try {
		const notifications = await Notifications.getPresentedNotificationsAsync();
		console.log("[MediaNotifications] Currently presented:", notifications.length);
		for (const n of notifications) {
			console.log("[MediaNotifications] -", n.request.identifier, ":", n.request.content.title);
		}
	} catch (error) {
		console.error("[MediaNotifications] Failed to get presented:", error);
	}
}

/**
 * Comprehensive setup function - call once at app startup.
 */
export async function setupMediaNotifications(): Promise<boolean> {
	console.log("[MediaNotifications] setupMediaNotifications called, isSetupComplete:", isSetupComplete);

	if (isSetupComplete) {
		console.log("[MediaNotifications] Already set up, returning:", permissionsGranted);
		return permissionsGranted;
	}

	try {
		// Initialize handler
		initializeMediaNotifications();

		// Set up Android channel
		await setupMediaNotificationChannel();

		// Set up initial category (will be updated when playing)
		await setupMediaNotificationCategory(false);

		// Request permissions
		permissionsGranted = await requestNotificationPermissions();

		isSetupComplete = true;
		console.log("[MediaNotifications] Setup complete, permissions:", permissionsGranted);
		return permissionsGranted;
	} catch (error) {
		console.error("[MediaNotifications] Setup failed:", error);
		return false;
	}
}
