import { adminPages } from "./surfaces/AdminPrototype";
import { examPages } from "./surfaces/ExamPrototype";
import { miniPages } from "./surfaces/MiniPrototype";
import type { FlowDefinition, PageId, PrototypePage, Surface } from "./types";

export const pageRegistry: PrototypePage[] = [
  ...miniPages,
  ...examPages,
  ...adminPages,
];

export const surfaceLabels: Record<Surface, string> = {
  mini: "员工小程序",
  exam: "正式考试端",
  admin: "管理后台",
};

export const flows: FlowDefinition[] = [
  {
    id: "E2E-01",
    title: "员工建档与激活",
    summary: "建档、初始凭据、首登改密与绑定",
    steps: [
      { pageId: "AD-03", scenario: "partial" },
      { pageId: "AD-04", scenario: "temporary-password" },
      { pageId: "MP-01", scenario: "first-login" },
      { pageId: "MP-02", scenario: "standard" },
    ],
  },
  {
    id: "E2E-02",
    title: "题库与批量导题",
    summary: "题库、上传、校验预览与确认导入",
    steps: [
      { pageId: "AD-05", scenario: "standard" },
      { pageId: "AD-08", scenario: "standard" },
      { pageId: "AD-09", scenario: "partial" },
      { pageId: "AD-06", scenario: "standard" },
    ],
  },
  {
    id: "E2E-03",
    title: "日常练习",
    summary: "配置、答题、即时反馈与错题复练",
    steps: [
      { pageId: "MP-03", scenario: "standard" },
      { pageId: "MP-04", scenario: "incorrect" },
      { pageId: "MP-05", scenario: "standard" },
      { pageId: "MP-11", scenario: "standard" },
    ],
  },
  {
    id: "E2E-04",
    title: "自助模拟考试",
    summary: "配置、固定试卷、提交或放弃与结果",
    steps: [
      { pageId: "MP-06", scenario: "standard" },
      { pageId: "MP-07", scenario: "standard" },
      { pageId: "MP-08", scenario: "standard" },
      { pageId: "MP-11", scenario: "mock-completed" },
    ],
  },
  {
    id: "E2E-05",
    title: "正式考试发布",
    summary: "五步配置、发布预检与冻结",
    steps: [
      { pageId: "AD-10", scenario: "standard" },
      { pageId: "AD-11", scenario: "standard" },
      { pageId: "AD-12", scenario: "standard" },
      { pageId: "AD-13", scenario: "standard" },
    ],
  },
  {
    id: "E2E-06",
    title: "正式作答与评分",
    summary: "任务定位、资格、开卷、作答、交卷与结果",
    steps: [
      { pageId: "MP-09", scenario: "standard" },
      { pageId: "MP-10", scenario: "standard" },
      { pageId: "EX-02", scenario: "standard" },
      { pageId: "EX-03", scenario: "standard" },
      { pageId: "EX-04", scenario: "standard" },
      { pageId: "EX-05", scenario: "standard" },
    ],
  },
  {
    id: "E2E-07",
    title: "平台故障暂停与恢复",
    summary: "监控触发、暂停、确认补时或结果锁定",
    steps: [
      { pageId: "EX-04", scenario: "paused" },
      { pageId: "AD-13", scenario: "pending" },
      { pageId: "EX-05", scenario: "locked" },
      { pageId: "MP-11", scenario: "formal-locked" },
    ],
  },
  {
    id: "E2E-08",
    title: "作废、重算与导出",
    summary: "尝试作废、官方成绩重算、导出与审计",
    steps: [
      { pageId: "AD-15", scenario: "standard" },
      { pageId: "AD-14", scenario: "recalculated" },
      { pageId: "MP-11", scenario: "invalidated" },
      { pageId: "EX-05", scenario: "voided" },
      { pageId: "AD-16", scenario: "standard" },
    ],
  },
];

export function getPage(pageId: string): PrototypePage | undefined {
  return pageRegistry.find(
    (page) => page.id.toLowerCase() === pageId.toLowerCase(),
  );
}

export function pagesForSurface(surface: Surface): PrototypePage[] {
  return pageRegistry.filter((page) => page.surface === surface);
}

export function isPageId(value: string): value is PageId {
  return pageRegistry.some((page) => page.id === value);
}
