ALTER TABLE `orders` ADD `razorpay_order_id` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `razorpay_payment_id` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `razorpay_signature` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_status` varchar(50) DEFAULT 'pending' NOT NULL;