-- Custom workflow per company + VARCHAR stages for custom keys (US: workflow stages).
ALTER TABLE companies
  ADD COLUMN workflow_config JSON NULL DEFAULT NULL
  COMMENT 'Per-pipeline stage definitions: sales, project_management';

ALTER TABLE leads
  MODIFY COLUMN stage VARCHAR(80) NOT NULL DEFAULT 'new';

ALTER TABLE projects
  MODIFY COLUMN stage VARCHAR(80) NOT NULL DEFAULT 'new';
