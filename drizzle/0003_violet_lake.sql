CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`expires_at` text NOT NULL,
	`credential_version` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `films` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`year` text NOT NULL,
	`director` text NOT NULL,
	`category` text NOT NULL,
	`kind` text NOT NULL,
	`note` text NOT NULL,
	`image` text NOT NULL,
	`watched` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `films_title_unique` ON `films` (`title`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `screenings` (
	`id` text PRIMARY KEY NOT NULL,
	`film_id` text NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `articles` ADD `status` text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE `contributions` ADD `status` text DEFAULT 'published' NOT NULL;