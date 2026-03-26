-- Map legacy project stage keys to the new installation / grid pipeline (safe if already migrated).
UPDATE projects SET stage = 'new'
  WHERE stage IN ('pre_approval', 'state_rebate', 'design_engineering', 'procurement');

UPDATE projects SET stage = 'ces_certificate_applied' WHERE stage = 'compliance_check';

UPDATE projects SET stage = 'grid_connection_initiated' WHERE stage = 'inspection_grid_connection';

UPDATE projects SET stage = 'grid_connection_completed' WHERE stage = 'rebate_stc_claims';

UPDATE projects SET stage = 'system_handover' WHERE stage = 'project_completed';
