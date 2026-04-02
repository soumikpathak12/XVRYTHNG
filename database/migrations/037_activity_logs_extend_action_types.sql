-- Extend activity log action types to support project/lead edits
ALTER TABLE activity_logs
  MODIFY COLUMN action_type ENUM(
    'lead_created',
    'stage_changed',
    'proposal_sent',
    'call_logged',
    'lead_updated',
    'project_updated',
    'project_stage_changed',
    'project_schedule_updated',
    'project_assignees_updated'
  ) NOT NULL;

