// ============================================================================
// HireMind AI — Domain types
// Mirrors the Redrob candidate schema + the ranking engine's outputs.
// ============================================================================

export type CompanySize =
  | "1-10" | "11-50" | "51-200" | "201-500"
  | "501-1000" | "1001-5000" | "5001-10000" | "10001+";

export type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";
export type WorkMode = "remote" | "hybrid" | "onsite" | "flexible";

export interface CandidateProfile {
  anonymized_name: string;
  headline: string;
  summary: string;
  location: string;
  country: string;
  years_of_experience: number;
  current_title: string;
  current_company: string;
  current_company_size: CompanySize;
  current_industry: string;
}

export interface CareerRole {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  duration_months: number;
  is_current: boolean;
  industry: string;
  company_size: CompanySize;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: number;
  end_year: number;
  grade?: string | null;
  tier?: "tier_1" | "tier_2" | "tier_3" | "tier_4" | "unknown";
}

export interface Skill {
  name: string;
  proficiency: Proficiency;
  endorsements: number;
  duration_months?: number;
}

export interface Certification { name: string; issuer: string; year: number; }
export interface Language { language: string; proficiency: string; }

export interface RedrobSignals {
  profile_completeness_score: number;
  signup_date: string;
  last_active_date: string;
  open_to_work_flag: boolean;
  profile_views_received_30d: number;
  applications_submitted_30d: number;
  recruiter_response_rate: number;
  avg_response_time_hours: number;
  skill_assessment_scores: Record<string, number>;
  connection_count: number;
  endorsements_received: number;
  notice_period_days: number;
  expected_salary_range_inr_lpa: { min: number; max: number };
  preferred_work_mode: WorkMode;
  willing_to_relocate: boolean;
  github_activity_score: number;
  search_appearance_30d: number;
  saved_by_recruiters_30d: number;
  interview_completion_rate: number;
  offer_acceptance_rate: number;
  verified_email: boolean;
  verified_phone: boolean;
  linkedin_connected: boolean;
}

export interface Candidate {
  candidate_id: string;
  profile: CandidateProfile;
  career_history: CareerRole[];
  education: Education[];
  skills: Skill[];
  certifications?: Certification[];
  languages?: Language[];
  redrob_signals: RedrobSignals;
  __honeypot?: boolean;
}

// ---------------------------------------------------------------------------
// Job description (parsed)
// ---------------------------------------------------------------------------

export interface ParsedJob {
  seniority: string;
  minYears: number;
  maxYears: number;
  idealYears: number;
  industry: string[];
  education: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  behavioralTraits: string[];
  behavioralRequirements: {
    preferActive: boolean;
    preferResponsive: boolean;
    preferLowNotice: boolean;
    preferRelocateOrLocal: string[];
  };
  antiSignals: string[];
  consultingFirms: string[];
}

export interface JobDescription {
  id: string;
  title: string;
  company: string;
  location: string;
  employmentType?: string;
  experienceRequired?: string;
  rawText: string;
  parsed: ParsedJob;
}

// ---------------------------------------------------------------------------
// Ranking engine outputs
// ---------------------------------------------------------------------------

/** The engineered feature vector (0–1 unless noted). */
export interface FeatureVector {
  skillMatch: number;
  requiredSkillCoverage: number;
  experienceMatch: number;
  industryMatch: number;
  leadershipScore: number;
  careerStability: number;
  promotionTrend: number;
  educationMatch: number;
  cultureFit: number;
  communicationScore: number;
  aiLlmExperience: number;
  ragExperience: number;
  vectorDbExperience: number;
  startupExperience: number;
  openSourceScore: number;
  githubActivity: number;
  careerGrowth: number;
  jobStability: number;
  // trap-detection
  keywordStuffingPenalty: number;
  consultingPenalty: number;
  antiSignalPenalty: number;
  honeypotRisk: number;
}

/** Headline component scores shown in the UI (0–100). */
export interface ComponentScores {
  semantic: number;
  skills: number;
  experience: number;
  education: number;
  stability: number;
  cultureFit: number;
  behavioral: number;
}

export interface Explanation {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: "Strong Hire" | "Interview" | "Maybe" | "Pass";
  whyAboveOthers: string;
}

export interface RankedCandidate {
  candidate: Candidate;
  rank: number;
  score: number;        // 0–1 composite (submission score)
  confidence: number;   // 0–100
  components: ComponentScores;
  features: FeatureVector;
  explanation: Explanation;
  reasoning: string;    // 1–2 sentence submission reasoning
  isHoneypot: boolean;
  bm25: number;
  semanticSim: number;
  crossEncoder: number;
}
