CREATE TABLE `contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`film` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
