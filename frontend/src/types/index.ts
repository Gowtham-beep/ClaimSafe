export type PolicyType = 'health' | 'term_life' | 'vehicle';
export type JobStatus =
  | 'uploaded'
  | 'extracting'
  | 'pass0_complete'
  | 'pass1_complete'
  | 'pass2_complete'
  | 'done'
  | 'failed';
export type Severity = 'high' | 'medium' | 'low';

export interface RiskFlag {
  title: string;
  plain_english: string;
  severity: Severity;
  severity_reason: string;
}

export interface AnalysisResult {
  policy_id: string;
  insurer: string;
  policy_type: PolicyType;
  sum_insured: string;
  premium: string;
  policy_period: string;
  risk_flags: RiskFlag[];
  exclusions: any[];
  waiting_periods: any[];
  sublimits: any[];
  copayments: any[];
  coverage_summary: string;
  claim_tips: any[];
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  policy_id?: string;
  error?: string | null;
}
