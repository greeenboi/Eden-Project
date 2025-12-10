DROP INDEX `artists_email_unique`;--> statement-breakpoint
ALTER TABLE `artists` DROP COLUMN `email`;--> statement-breakpoint
ALTER TABLE `artists` DROP COLUMN `profile`;--> statement-breakpoint
ALTER TABLE `tracks` ADD `artwork_url` text;