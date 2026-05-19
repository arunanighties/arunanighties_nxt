ALTER TABLE `orders` ADD `awb_number` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `addresses` text;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);