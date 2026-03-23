
CREATE TABLE IF NOT EXISTS `site_inspection_checklist_templates` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `company_id` int(10) UNSIGNED DEFAULT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Template name (e.g., Solar Installation, Electrical Check)',
  `description` text DEFAULT NULL COMMENT 'Template description',
  `items` json NOT NULL COMMENT 'Array of checklist items: [{text: string, order: number}]',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Whether template is available for use',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL ON UPDATE CURRENT_TIMESTAMP,
  
  KEY `idx_company_id` (`company_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_checklist_template_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default common templates
INSERT INTO `site_inspection_checklist_templates` (`name`, `description`, `items`, `is_active`) VALUES
(
  'Solar Installation',
  'Standard checklist for solar panel installation inspections',
  JSON_ARRAY(
    JSON_OBJECT('text', 'Verify roof condition and integrity', 'order', 1),
    JSON_OBJECT('text', 'Check safety harness connection points', 'order', 2),
    JSON_OBJECT('text', 'Inspect electrical panel accessibility', 'order', 3),
    JSON_OBJECT('text', 'Verify cable routing and conduit', 'order', 4),
    JSON_OBJECT('text', 'Test emergency shut-off procedures', 'order', 5),
    JSON_OBJECT('text', 'Confirm proper earthing/grounding', 'order', 6),
    JSON_OBJECT('text', 'Check inverter mounting and ventilation', 'order', 7),
    JSON_OBJECT('text', 'Verify all warning labels installed', 'order', 8)
  ),
  1
),
(
  'Electrical Check',
  'Comprehensive electrical system inspection',
  JSON_ARRAY(
    JSON_OBJECT('text', 'Test main switchboard functionality', 'order', 1),
    JSON_OBJECT('text', 'Verify circuit breaker operation', 'order', 2),
    JSON_OBJECT('text', 'Check RCD/GFCI protection', 'order', 3),
    JSON_OBJECT('text', 'Measure voltage at key points', 'order', 4),
    JSON_OBJECT('text', 'Inspect cable insulation', 'order', 5),
    JSON_OBJECT('text', 'Test earth continuity', 'order', 6),
    JSON_OBJECT('text', 'Verify proper labeling of circuits', 'order', 7)
  ),
  1
),
(
  'Roof Assessment',
  'Detailed roof condition and safety check',
  JSON_ARRAY(
    JSON_OBJECT('text', 'Inspect roof material condition', 'order', 1),
    JSON_OBJECT('text', 'Check for loose tiles or covering damage', 'order', 2),
    JSON_OBJECT('text', 'Verify roof pitch measurement', 'order', 3),
    JSON_OBJECT('text', 'Assess structural integrity', 'order', 4),
    JSON_OBJECT('text', 'Check for water damage or leaks', 'order', 5),
    JSON_OBJECT('text', 'Identify shading obstacles', 'order', 6),
    JSON_OBJECT('text', 'Verify anchor points for safety equipment', 'order', 7),
    JSON_OBJECT('text', 'Document roof access method', 'order', 8)
  ),
  1
),
(
  'Safety Compliance',
  'General safety and compliance verification',
  JSON_ARRAY(
    JSON_OBJECT('text', 'Verify all safety signage in place', 'order', 1),
    JSON_OBJECT('text', 'Check for asbestos risk areas', 'order', 2),
    JSON_OBJECT('text', 'Confirm adequate lighting conditions', 'order', 3),
    JSON_OBJECT('text', 'Inspect for tripping hazards', 'order', 4),
    JSON_OBJECT('text', 'Verify emergency equipment accessible', 'order', 5),
    JSON_OBJECT('text', 'Check ventilation adequacy', 'order', 6),
    JSON_OBJECT('text', 'Confirm proper PPE requirements', 'order', 7)
  ),
  1
);

-- Add index for performance
ALTER TABLE `site_inspection_checklist_templates` 
  ADD INDEX `idx_name` (`name`),
  ADD INDEX `idx_created_at` (`created_at`);
