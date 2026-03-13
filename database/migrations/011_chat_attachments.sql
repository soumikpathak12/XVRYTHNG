-- 011_chat_attachments.sql
-- Adds support for images and file attachments in chat messages

CREATE TABLE IF NOT EXISTS `message_attachments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `message_id` int(10) unsigned NOT NULL,
  `conversation_id` int(10) unsigned NOT NULL,
  `filename` varchar(255) NOT NULL,
  `mimetype` varchar(100) NOT NULL,
  `storage_url` varchar(1024) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_msg_attachments_message` (`message_id`),
  KEY `idx_msg_attachments_conversation` (`conversation_id`),
  CONSTRAINT `fk_msg_attachments_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_attachments_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
