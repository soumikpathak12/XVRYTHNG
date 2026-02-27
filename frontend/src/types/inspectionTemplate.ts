export type JobType =
  | 'solar_pv'
  | 'solar_battery'
  | 'battery_only'
  | 'ev_charger'
  | 'off_grid';

export interface Template {
  id?: number | string;
  key: string;               // 'solar_pv', 'ev_charger', ...
  name: string;              // "Solar PV"
  version: number;
  status: 'draft' | 'published';
  appliesTo: JobType[];
  steps: Step[];
  validation?: {
    requiredFields?: string[];
  };
  meta?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Step {
  id: string;                // 'core', 'roof', ...
  label: string;             // "Core Details"
  sections: Section[];
}

export interface Section {
  id: string;
  label: string;
  description?: string;
  fields: Field[];
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'datetime'
  | 'toggle'
  | 'file'
  | 'photo'
  | 'group'
  | 'array';

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  accept?: string; // image/*,application/pdf
  default?: any;
  helpText?: string;

  // Group or array items
  children?: Field[];

  visibleIf?: {
    field: string;
    operator?: 'eq' | 'ne' | 'in' | 'notin' | 'truthy' | 'falsy';
    value?: any;
  };
}