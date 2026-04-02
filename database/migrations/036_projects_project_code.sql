
ALTER TABLE projects
  ADD COLUMN project_code VARCHAR(32)
    AS (CONCAT('PRJ-', lead_id)) STORED;

CREATE INDEX idx_projects_project_code ON projects (project_code);
