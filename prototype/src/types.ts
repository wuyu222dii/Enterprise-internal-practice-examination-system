export type Surface = "mini" | "exam" | "admin";

export type MiniPageId =
  | "MP-01"
  | "MP-02"
  | "MP-03"
  | "MP-04"
  | "MP-05"
  | "MP-06"
  | "MP-07"
  | "MP-08"
  | "MP-09"
  | "MP-10"
  | "MP-11"
  | "MP-12";

export type ExamPageId = "EX-01" | "EX-02" | "EX-03" | "EX-04" | "EX-05";

export type AdminPageId =
  | "AD-01"
  | "AD-02"
  | "AD-03"
  | "AD-04"
  | "AD-05"
  | "AD-06"
  | "AD-07"
  | "AD-08"
  | "AD-09"
  | "AD-10"
  | "AD-11"
  | "AD-12"
  | "AD-13"
  | "AD-14"
  | "AD-15"
  | "AD-16";

export type PageId = MiniPageId | ExamPageId | AdminPageId;

export type FlowId =
  | "E2E-01"
  | "E2E-02"
  | "E2E-03"
  | "E2E-04"
  | "E2E-05"
  | "E2E-06"
  | "E2E-07"
  | "E2E-08";

export type RoleProfile = "employee" | "admin" | "authorized-admin";
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export interface ScenarioDefinition {
  id: string;
  label: string;
  description: string;
  tone?: Tone;
}

export interface PrototypePage {
  id: PageId;
  surface: Surface;
  title: string;
  description: string;
  scenarios: ScenarioDefinition[];
  fr: string[];
  flows: string[];
  acceptance: string[];
}

export interface SurfacePrototypeProps {
  page: PrototypePage;
  scenario: string;
  navigateTo: (pageId: PageId, scenario?: string) => void;
  setScenario: (scenario: string) => void;
}

export interface FlowDefinition {
  id: FlowId;
  title: string;
  summary: string;
  steps: { pageId: PageId; scenario: string }[];
}
