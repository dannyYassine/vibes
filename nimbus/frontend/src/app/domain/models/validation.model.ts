export type ValidationSeverity = 'Error' | 'Warning' | 'Info';

export type ValidationRule =
  | 'ORPHAN_NODE'
  | 'MISSING_EDGE_TARGET'
  | 'DUPLICATE_EDGE'
  | 'SELF_REFERENCING_EDGE'
  | 'DISCONNECTED_SUBGRAPH'
  | 'MISSING_SECURITY'
  | 'MISSING_OBSERVABILITY'
  | 'SINGLE_AZ'
  | 'NO_CACHING'
  | 'CIRCULAR_DEPENDENCY';

export interface ValidationWarning {
  id: string;
  severity: ValidationSeverity;
  message: string;
  nodeIds: string[];
  edgeIds: string[];
  rule: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
}
