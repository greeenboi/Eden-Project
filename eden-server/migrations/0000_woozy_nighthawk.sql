CREATE TABLE `albums` (
	`id` text PRIMARY KEY NOT NULL,
	`artist_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`artwork_url` text,
	`release_date` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `artists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`profile` text,
	`bio` text,
	`avatar_url` text,
	`verified` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `artists_email_unique` ON `artists` (`email`);--> statement-breakpoint
CREATE TABLE `playback_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`track_id` text NOT NULL,
	`percent_listened` real NOT NULL,
	`duration` real NOT NULL,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `playlist_tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`playlist_id` text NOT NULL,
	`track_id` text NOT NULL,
	`position` integer NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`cover_url` text,
	`is_public` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`artist_id` text NOT NULL,
	`album_id` text,
	`title` text NOT NULL,
	`duration` real,
	`r2_key_original` text,
	`encodings` text,
	`status` text DEFAULT 'initiated' NOT NULL,
	`isrc` text,
	`genre` text,
	`explicit` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `upload_records` (
	`id` text PRIMARY KEY NOT NULL,
	`artist_id` text NOT NULL,
	`track_id` text,
	`status` text DEFAULT 'initiated' NOT NULL,
	`r2_key` text,
	`signed_url_expires_at` integer,
	`file_size` integer,
	`mime_type` text,
	`error_message` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`subscription_tier` text DEFAULT 'free' NOT NULL,
	`region` text,
	`device_limits` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);