import { useState, type ReactNode } from "react";
import {
  AlertOctagon,
  BookOpenCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Clock3,
  Download,
  FileClock,
  FileDown,
  FileSearch,
  FileSpreadsheet,
  FolderTree,
  KeyRound,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  UserRoundCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  Badge,
  Banner,
  Button,
  EmptyState,
  IconButton,
  Metric,
  Modal,
  ProgressBar,
  SectionHeader,
} from "../components/ui";
import type {
  PageId,
  PrototypePage,
  SurfacePrototypeProps,
  Tone,
} from "../types";
import "./AdminPrototype.css";

const standard = {
  id: "standard",
  label: "标准状态",
  description: "页面默认可操作状态。",
  tone: "neutral" as const,
};
const state = (
  id: string,
  label: string,
  description: string,
  tone: Tone = "warning",
) => ({ id, label, description, tone });

export const adminPages: PrototypePage[] = [
  {
    id: "AD-01",
    surface: "admin",
    title: "登录",
    description: "管理员登录、首次改密与短信找回",
    scenarios: [
      standard,
      state(
        "first-change",
        "首次改密",
        "临时密码登录后必须先设置新密码。",
        "info",
      ),
      state("locked", "账号锁定", "连续失败后账号进入 15 分钟锁定。"),
      state("revoked", "停用或撤权", "当前账号无法进入管理后台。", "danger"),
      state("expired", "会话失效", "清除受保护内容并重新登录。", "danger"),
    ],
    fr: ["FR-AUTH-01", "FR-AUTH-02", "FR-AUTH-03", "FR-AUTH-06"],
    flows: ["E2E-01"],
    acceptance: ["ACC-02", "ACC-03", "SEC-05"],
  },
  {
    id: "AD-02",
    surface: "admin",
    title: "部门",
    description: "维护无循环部门树与完整部门路径",
    scenarios: [
      standard,
      state("empty", "空部门树", "企业尚未创建部门。", "info"),
      state(
        "cycle",
        "循环移动",
        "目标上级位于当前节点的下级路径中。",
        "danger",
      ),
      state("blocked", "停用受阻", "部门仍有员工或下级部门。", "danger"),
      state("stale", "并发变更", "当前部门已由其他管理员修改。"),
    ],
    fr: ["FR-AUTH-04", "FR-EXM-03"],
    flows: ["E2E-01"],
    acceptance: ["ACC-01", "PUB-04"],
  },
  {
    id: "AD-03",
    surface: "admin",
    title: "员工与导入",
    description: "员工建档、批量导入与一次性凭据交付",
    scenarios: [
      standard,
      state("empty", "无员工", "当前企业尚无员工档案。", "info"),
      state("partial", "部分可导入", "合法行可建档，冲突行将跳过。"),
      state(
        "credential",
        "凭据待下载",
        "批量凭据 24 小时内仅可成功下载一次。",
        "success",
      ),
      state("expired", "凭据已失效", "凭据已下载或超过有效期。", "danger"),
      state("disabled", "员工已停用", "历史保留，新业务请求被禁止."),
    ],
    fr: ["FR-AUTH-02", "FR-AUTH-04", "FR-AUTH-05"],
    flows: ["E2E-01"],
    acceptance: ["ACC-01", "ACC-02", "ACC-05"],
  },
  {
    id: "AD-04",
    surface: "admin",
    title: "账号与授权",
    description: "账号恢复、绑定、管理员资格和异常授权",
    scenarios: [
      standard,
      state(
        "temporary-password",
        "临时密码结果",
        "密码仅在当前结果层显示一次。",
        "success",
      ),
      state(
        "last-admin",
        "最后管理员",
        "必须先授予另一名有效员工管理员资格。",
        "danger",
      ),
      state(
        "last-ops",
        "最后异常授权人",
        "必须先授权另一名有效管理员。",
        "danger",
      ),
      state("disabled", "账号已停用", "不可授予管理员资格或异常处置授权。"),
    ],
    fr: ["FR-AUTH-01", "FR-AUTH-02", "FR-AUTH-03", "FR-AUTH-05"],
    flows: ["E2E-01", "E2E-07"],
    acceptance: ["ACC-03", "ACC-04", "ACC-06", "OUT-01"],
  },
  {
    id: "AD-05",
    surface: "admin",
    title: "题库设置",
    description: "管理题库业务状态及练习、模拟开放策略",
    scenarios: [
      standard,
      state("empty", "无题库", "尚未建立企业题库。", "info"),
      state("disabled", "题库已停用", "历史可查，未来业务引用被禁止。"),
      state("conflict", "保存冲突", "设置已被其他管理员更新。", "danger"),
    ],
    fr: ["FR-QST-01", "FR-IMP-01", "FR-EXM-03"],
    flows: ["E2E-02"],
    acceptance: ["IMP-01", "PUB-04"],
  },
  {
    id: "AD-06",
    surface: "admin",
    title: "分类、知识点与题目",
    description: "维护题库目录与逻辑题目当前版本",
    scenarios: [
      standard,
      state("no-category", "无分类", "需先创建分类才能新建题目。", "info"),
      state("empty", "分类无题", "当前分类尚无题目。", "info"),
      state("disabled", "题库只读", "题库停用后仅可查看历史。"),
      state("changed", "题目已变更", "旧状态写入被拒绝。", "danger"),
    ],
    fr: ["FR-QST-02", "FR-QST-03", "FR-QST-04"],
    flows: ["E2E-02"],
    acceptance: ["QST-01", "QST-02"],
  },
  {
    id: "AD-07",
    surface: "admin",
    title: "单题与版本",
    description: "纯文本题目编辑与不可变版本历史",
    scenarios: [
      standard,
      state("new", "新建题目", "创建题目的第一个版本。", "info"),
      state("history", "历史版本", "历史版本永久只读。", "neutral"),
      state("disabled", "题目已停用", "当前题目不再进入未来抽题。"),
      state("conflict", "版本冲突", "保存时已产生更新版本。", "danger"),
    ],
    fr: ["FR-QST-02", "FR-QST-03", "FR-QST-04", "FR-SCR-01"],
    flows: ["E2E-02"],
    acceptance: ["QST-01", "QST-02", "SCR-01", "PUB-04"],
  },
  {
    id: "AD-08",
    surface: "admin",
    title: "导题任务",
    description: "追踪 Excel 导题任务全生命周期",
    scenarios: [
      standard,
      state("validating", "校验中", "文件正在解析校验。", "info"),
      state("revalidate", "需重新校验", "预览依据已变化。"),
      state("success", "导入成功", "合法数据已原子写入题库。", "success"),
      state("expired", "任务已过期", "终态摘要保留，文件不可下载。", "danger"),
    ],
    fr: ["FR-IMP-01", "FR-IMP-03", "FR-IMP-04", "FR-IMP-05"],
    flows: ["E2E-02"],
    acceptance: ["IMP-01", "IMP-02", "IMP-03", "IMP-09", "RET-01"],
  },
  {
    id: "AD-09",
    surface: "admin",
    title: "校验预览",
    description: "预览合法行、错误行与待建目录后确认导入",
    scenarios: [
      standard,
      state("partial", "部分可导入", "972 行可导入，28 行跳过。"),
      state(
        "file-failure",
        "文件级失败",
        "模板、加密或文件结构不合法。",
        "danger",
      ),
      state("all-invalid", "全部不可导入", "确认操作不可用。", "danger"),
      state("revalidate", "需重新校验", "预览失效，禁止继续确认。"),
      state("confirming", "确认处理中", "重复请求查询同一写入结果。", "info"),
    ],
    fr: ["FR-IMP-02", "FR-IMP-03", "FR-IMP-04"],
    flows: ["E2E-02"],
    acceptance: [
      "IMP-02",
      "IMP-03",
      "IMP-04",
      "IMP-05",
      "IMP-06",
      "IMP-07",
      "IMP-08",
    ],
  },
  {
    id: "AD-10",
    surface: "admin",
    title: "考试列表",
    description: "按生命周期与运行状态管理正式考试",
    scenarios: [
      standard,
      state("empty", "无考试", "尚未创建正式考试。", "info"),
      state("open", "开放开卷", "员工可创建合法尝试。", "success"),
      state("paused", "暂停中", "生命周期不变，业务能力暂停。", "danger"),
      state("closing", "收尾中", "停止新开卷并进入 20 秒观察。"),
      state("canceled", "已取消", "仅保留不具官方效力的历史。", "danger"),
    ],
    fr: ["FR-EXM-04", "FR-EXM-05", "FR-REP-01"],
    flows: ["E2E-05"],
    acceptance: ["CAN-01", "REP-01", "TIM-02"],
  },
  {
    id: "AD-11",
    surface: "admin",
    title: "五步配置向导",
    description: "配置基础信息、原子组卷、人员和公开策略",
    scenarios: [
      standard,
      state("incomplete", "规则不完整", "草稿可保存，但不能通过复核。"),
      state(
        "empty-people",
        "人员范围为空",
        "应考人员至少需要 1 人。",
        "danger",
      ),
      state("pass-over", "及格分超总分", "基础信息需重新修正。", "danger"),
      state("frozen", "已发布只读", "冻结配置不可原地修改。", "neutral"),
    ],
    fr: ["FR-EXM-01", "FR-EXM-02", "FR-EXM-03", "FR-SCR-04"],
    flows: ["E2E-05"],
    acceptance: ["PUB-01", "VIS-01", "VIS-02", "CAP-01"],
  },
  {
    id: "AD-12",
    surface: "admin",
    title: "发布预检与冻结",
    description: "预检规则、人员、容量并原子冻结发布",
    scenarios: [
      standard,
      state("checking", "预检中", "逐项核对发布依据。", "info"),
      state("failed", "预检失败", "候选不足或规则重叠阻止发布。", "danger"),
      state("passed", "预检通过", "可以二次确认发布。", "success"),
      state("stale", "依据已变", "原通过结果失效并重新预检。"),
      state("paused", "平台暂停", "禁止把预检结果转换为发布。", "danger"),
      state("publishing", "发布处理中", "重复操作返回相同发布结果。", "info"),
    ],
    fr: ["FR-EXM-02", "FR-EXM-03", "FR-EXM-04"],
    flows: ["E2E-05"],
    acceptance: ["PUB-01", "PUB-02", "PUB-03", "PUB-04", "PUB-05", "CAP-01"],
  },
  {
    id: "AD-13",
    surface: "admin",
    title: "过程监控与异常",
    description: "监控正式考试、故障补时与整场取消",
    scenarios: [
      standard,
      state("closing", "整场结束观察", "停止新开卷后执行 20 秒观察。"),
      state("paused", "运行暂停", "显示暂停范围与在途人数。", "danger"),
      state("triggered", "故障已触发", "监控已创建开放影响区间。", "danger"),
      state("pending", "故障待确认", "授权管理员可确认或驳回只读提案。"),
      state("review", "系统复核中", "驳回后保持暂停并生成新证据版本。", "info"),
      state("confirmed", "故障已确认", "补时已原子执行并恢复业务。", "success"),
      state(
        "closed",
        "故障已关闭",
        "仅系统在受影响考试取消且恢复后关闭。",
        "neutral",
      ),
      state(
        "result-locked",
        "严重故障待取消",
        "官方结果与披露已锁定。",
        "danger",
      ),
      state("canceled", "考试已取消", "历史只读，不计入官方统计。", "danger"),
    ],
    fr: ["FR-EXM-04", "FR-EXM-05", "FR-REP-01", "FR-OPS-01", "FR-OPS-02"],
    flows: ["E2E-05", "E2E-07"],
    acceptance: [
      "PUB-05",
      "TIM-02",
      "VIS-02",
      "OUT-01",
      "CAN-01",
      "REP-01",
      "OPS-01",
    ],
  },
  {
    id: "AD-14",
    surface: "admin",
    title: "成绩统计与导出",
    description: "官方成绩统计与异步双工作表导出",
    scenarios: [
      standard,
      state("nonfinal", "非最终统计", "观察、暂停或待处置故障期间不结算终态。"),
      state("multi", "多次尝试", "按最高有效分选取官方尝试。", "info"),
      state(
        "recalculated",
        "作废后重算",
        "官方分和全场指标已同步更新。",
        "success",
      ),
      state("locked", "结果锁定", "官方统计和导出不可用。", "danger"),
      state("canceled", "考试已取消", "仅展示取消前历史。", "danger"),
      state("export-failed", "导出失败", "不提供不完整文件。", "danger"),
      state("export-expired", "导出已过期", "可重新生成新任务。"),
    ],
    fr: ["FR-REP-01", "FR-REP-02", "FR-REP-03", "FR-SCR-02"],
    flows: ["E2E-08"],
    acceptance: [
      "TIM-02",
      "OUT-01",
      "SCR-02",
      "REP-01",
      "REP-02",
      "PERF-04",
      "RET-01",
    ],
  },
  {
    id: "AD-15",
    surface: "admin",
    title: "尝试详情与作废",
    description: "查看固定试卷与只读评分事实并作废尝试",
    scenarios: [
      standard,
      state(
        "in-progress",
        "尝试进行中",
        "已确认答案只读，可由管理员作废并返还次数。",
        "info",
      ),
      state("processing", "交卷处理中", "等待交卷和评分收敛。"),
      state("voided", "尝试已作废", "原数据保留并退出官方成绩。", "danger"),
      state(
        "voided-active",
        "进行中尝试已作废",
        "已确认答案保留且不生成得分。",
        "danger",
      ),
      state("terminated", "已终止或取消", "全部事实无官方效力。", "danger"),
      state("voiding", "作废处理中", "重复请求返回同一结果。", "info"),
    ],
    fr: ["FR-ATT-02", "FR-SCR-01", "FR-SCR-02", "FR-SCR-03", "FR-REP-02"],
    flows: ["E2E-08"],
    acceptance: ["SCR-01", "SCR-02", "SCR-03", "SEC-04"],
  },
  {
    id: "AD-16",
    surface: "admin",
    title: "审计日志",
    description: "只读查询关键操作和故障证据链",
    scenarios: [
      standard,
      state("empty", "无匹配记录", "保留当前筛选条件。", "info"),
      state(
        "integrity",
        "完整性告警",
        "日志验证发现异常，后台不可修改原记录。",
        "danger",
      ),
      state(
        "incomplete",
        "故障链不完整",
        "证据版本缺失或状态跳转非法。",
        "danger",
      ),
      state("revoked", "导出权限撤销", "下载被拒绝并记录授权拒绝。", "danger"),
    ],
    fr: ["FR-OPS-02", "FR-OPS-03", "FR-OPS-04", "FR-AUTH-06"],
    flows: ["E2E-08"],
    acceptance: ["OUT-01", "SEC-01", "AUD-01", "RET-01"],
  },
];

type ModalKind =
  | "create"
  | "import"
  | "disable"
  | "publish"
  | "confirm-outage"
  | "reject-outage"
  | "cancel-exam"
  | "void-attempt"
  | "export"
  | "secret"
  | null;

const navGroups: {
  label: string;
  icon: typeof Users;
  pages: { id: PageId; label: string }[];
}[] = [
  {
    label: "组织与员工",
    icon: Users,
    pages: [
      { id: "AD-03", label: "员工" },
      { id: "AD-02", label: "部门" },
      { id: "AD-04", label: "账号与授权" },
    ],
  },
  {
    label: "题库",
    icon: BookOpenCheck,
    pages: [
      { id: "AD-05", label: "题库设置" },
      { id: "AD-06", label: "题目管理" },
      { id: "AD-08", label: "导题任务" },
    ],
  },
  {
    label: "考试",
    icon: ClipboardCheck,
    pages: [{ id: "AD-10", label: "考试列表" }],
  },
  {
    label: "审计",
    icon: FileSearch,
    pages: [{ id: "AD-16", label: "审计日志" }],
  },
];

const cell = (value: ReactNode, meta?: string) => (
  <span className="admin-cell">
    <span>{value}</span>
    {meta && <small>{meta}</small>}
  </span>
);

function Status({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <Badge tone={tone}>{children}</Badge>;
}

function DataTable({
  headers,
  rows,
  compact = false,
}: {
  headers: string[];
  rows: ReactNode[][];
  compact?: boolean;
}) {
  return (
    <div className="admin-table-wrap">
      <table className={`admin-table ${compact ? "admin-table--compact" : ""}`}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((value, cellIndex) => (
                <td key={cellIndex}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({
  label,
  value,
  type = "text",
  disabled = false,
  hint,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  type?: "text" | "password" | "select" | "textarea";
  disabled?: boolean;
  hint?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {type === "textarea" ? (
        <textarea defaultValue={value} disabled={disabled} />
      ) : type === "select" ? (
        <span className="admin-select">
          <select defaultValue={value} disabled={disabled}>
            <option>{value}</option>
            <option>全部</option>
          </select>
          <ChevronDown size={14} />
        </span>
      ) : (
        <input
          type={type === "password" ? "password" : "text"}
          {...(onChange ? { value } : { defaultValue: value })}
          disabled={disabled}
          placeholder={placeholder}
          onChange={
            onChange ? (event) => onChange(event.target.value) : undefined
          }
        />
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function FilterBar({
  children,
  onSearch,
}: {
  children: ReactNode;
  onSearch?: () => void;
}) {
  return (
    <div className="admin-filter">
      {children}
      <Button variant="secondary" onClick={onSearch}>
        <Search size={15} />
        查询
      </Button>
      <Button variant="ghost">重置</Button>
    </div>
  );
}

function Toggle({
  label,
  checked = false,
  disabled = false,
}: {
  label: string;
  checked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={`admin-toggle ${disabled ? "is-disabled" : ""}`}>
      <input type="checkbox" defaultChecked={checked} disabled={disabled} />
      <span aria-hidden="true" />
      <b>{label}</b>
    </label>
  );
}

function PageTop({
  eyebrow,
  title,
  description,
  status,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-page-top">
      <div>
        <span className="admin-eyebrow">{eyebrow ?? "管理后台"}</span>
        <div className="admin-title-line">
          <h1>{title}</h1>
          {status}
        </div>
        <p>{description}</p>
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}

function ScenarioNotice({
  page,
  scenario,
}: {
  page: PrototypePage;
  scenario: string;
}) {
  if (scenario === "standard") return null;
  const current = page.scenarios.find((item) => item.id === scenario);
  if (!current) return null;
  return (
    <Banner title={current.label} tone={current.tone}>
      {current.description}
    </Banner>
  );
}

function AdminShell({
  page,
  navigateTo,
  children,
}: {
  page: PrototypePage;
  navigateTo: SurfacePrototypeProps["navigateTo"];
  children: ReactNode;
}) {
  return (
    <div className="admin-app">
      <aside className="admin-nav">
        <div className="admin-product">
          <span className="admin-product__mark">企</span>
          <div>
            <strong>企业学习考试</strong>
            <small>管理后台</small>
          </div>
        </div>
        <nav aria-label="管理后台导航">
          {navGroups.map((group) => {
            const Icon = group.icon;
            return (
              <section key={group.label} className="admin-nav-group">
                <h2>
                  <Icon size={15} />
                  {group.label}
                </h2>
                {group.pages.map((item) => (
                  <button
                    key={item.id}
                    className={
                      item.id === page.id ||
                      (item.id === "AD-06" &&
                        ["AD-07", "AD-09"].includes(page.id)) ||
                      (item.id === "AD-10" &&
                        ["AD-11", "AD-12", "AD-13", "AD-14", "AD-15"].includes(
                          page.id,
                        ))
                        ? "is-active"
                        : ""
                    }
                    onClick={() => navigateTo(item.id)}
                  >
                    {item.label}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </section>
            );
          })}
        </nav>
        <div className="admin-nav__foot">
          <ShieldCheck size={16} />
          <span>
            企业时区
            <br />
            <b>Pacific/Auckland</b>
          </span>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span>星云科技有限公司</span>
            <Badge tone="success">服务正常</Badge>
          </div>
          <div className="admin-user">
            <span className="admin-avatar">周</span>
            <span>
              <b>周敏</b>
              <small>异常处置已授权</small>
            </span>
            <IconButton label="退出登录" onClick={() => navigateTo("AD-01")}>
              <LogOut size={16} />
            </IconButton>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

function LoginPage({
  scenario,
  navigateTo,
}: Pick<SurfacePrototypeProps, "scenario" | "navigateTo">) {
  const [recovery, setRecovery] = useState(false);
  const [recoveryCodeSent, setRecoveryCodeSent] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const firstChange = scenario === "first-change";
  const blocked = ["locked", "revoked", "expired"].includes(scenario);
  const passwordClasses = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(
    (pattern) => pattern.test(newPassword),
  ).length;
  const passwordValid =
    newPassword.length >= 8 &&
    newPassword.length <= 64 &&
    passwordClasses >= 3 &&
    !["A0008", "13800009062"].includes(newPassword);
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSavePassword = passwordValid && passwordsMatch;
  if (recovery) {
    return (
      <div className="admin-login">
        <div className="admin-login__brand">
          <span>企</span>
          <div>
            <strong>企业学习与考试系统</strong>
            <small>Web 管理后台</small>
          </div>
        </div>
        <div className="admin-login__panel">
          <div className="admin-login__heading">
            <KeyRound size={26} />
            <div>
              <h1>找回管理员账号</h1>
              <p>短信仅用于企业账号验证与恢复</p>
            </div>
          </div>
          <Field label="工号 / 账号" value="A0008" />
          <p className="admin-form-help">验证码发送至档案手机号 138****9062</p>
          <label className="admin-field">
            <span>6 位短信验证码</span>
            <input
              aria-label="6 位短信验证码"
              inputMode="numeric"
              value={recoveryCode}
              onChange={(event) =>
                setRecoveryCode(
                  event.target.value.replace(/\D/g, "").slice(0, 6),
                )
              }
              placeholder="000000"
            />
          </label>
          <Button
            variant="secondary"
            onClick={() => {
              setRecoveryCodeSent(true);
              setRecoveryCode("");
            }}
          >
            {recoveryCodeSent ? "验证码已发送" : "发送验证码"}
          </Button>
          <Field
            label="设置新密码"
            type="password"
            value={newPassword}
            placeholder="8-64 位，四类字符至少三类"
            onChange={setNewPassword}
          />
          <Field
            label="确认新密码"
            type="password"
            value={confirmPassword}
            placeholder="请再次输入"
            hint={
              confirmPassword && !passwordsMatch ? "两次输入不一致" : undefined
            }
            onChange={setConfirmPassword}
          />
          <p className="admin-form-help">
            {passwordValid
              ? "密码强度符合要求"
              : "8-64 位字符，大写、小写、数字、特殊字符至少满足三类"}
          </p>
          <Button
            disabled={
              !recoveryCodeSent || recoveryCode.length !== 6 || !canSavePassword
            }
            onClick={() => setRecovery(false)}
          >
            验证并重置密码
          </Button>
          <button
            className="admin-text-button"
            onClick={() => setRecovery(false)}
          >
            返回登录
          </button>
        </div>
        <p className="admin-login__foot">
          简体中文 · 所有业务时间按企业时区显示
        </p>
      </div>
    );
  }
  return (
    <div className="admin-login">
      <div className="admin-login__brand">
        <span>企</span>
        <div>
          <strong>企业学习与考试系统</strong>
          <small>Web 管理后台</small>
        </div>
      </div>
      <div className="admin-login__panel">
        <div className="admin-login__heading">
          <ShieldCheck size={26} />
          <div>
            <h1>{firstChange ? "设置新密码" : "管理员登录"}</h1>
            <p>
              {firstChange
                ? "首次登录必须修改一次性临时密码"
                : "使用企业工号和密码进入后台"}
            </p>
          </div>
        </div>
        {scenario !== "standard" && (
          <Banner
            title={
              scenario === "locked"
                ? "账号暂时锁定"
                : scenario === "revoked"
                  ? "无法进入管理后台"
                  : scenario === "expired"
                    ? "会话已失效"
                    : "首次改密"
            }
            tone={
              scenario === "revoked" || scenario === "expired"
                ? "danger"
                : "warning"
            }
          >
            {scenario === "locked"
              ? "请在 15 分钟后重试。"
              : scenario === "revoked"
                ? "账号已停用或管理员资格已撤销。"
                : scenario === "expired"
                  ? "请重新验证身份。"
                  : "完成改密前不开放业务导航。"}
          </Banner>
        )}
        <div className="admin-form-stack">
          {!firstChange && <Field label="工号 / 账号" value="A0008" />}
          <Field
            label={firstChange ? "新密码" : "密码"}
            type="password"
            value={firstChange ? newPassword : "••••••••••"}
            placeholder={firstChange ? "8-64 位，四类字符至少三类" : undefined}
            onChange={firstChange ? setNewPassword : undefined}
          />
          {firstChange && (
            <>
              <Field
                label="确认新密码"
                type="password"
                value={confirmPassword}
                placeholder="请再次输入"
                hint={
                  confirmPassword && !passwordsMatch
                    ? "两次输入不一致"
                    : undefined
                }
                onChange={setConfirmPassword}
              />
              <p className="admin-form-help">
                {passwordValid
                  ? "密码强度符合要求"
                  : "8-64 位字符，大写、小写、数字、特殊字符至少满足三类"}
              </p>
            </>
          )}
        </div>
        <Button
          disabled={
            (blocked && scenario !== "expired") ||
            (firstChange && !canSavePassword)
          }
          onClick={() => navigateTo("AD-03")}
        >
          {firstChange ? "保存并进入后台" : "登录"}
          <ChevronRight size={16} />
        </Button>
        <button className="admin-text-button" onClick={() => setRecovery(true)}>
          使用短信验证码找回密码
        </button>
      </div>
      <p className="admin-login__foot">简体中文 · 所有业务时间按企业时区显示</p>
    </div>
  );
}

function DepartmentPage({
  scenario,
  openModal,
}: {
  scenario: string;
  openModal: (kind: ModalKind) => void;
}) {
  if (scenario === "empty")
    return (
      <>
        <PageTop
          title="部门"
          description="维护企业部门层级和员工主部门路径"
          actions={
            <Button>
              <Plus size={15} />
              创建根部门
            </Button>
          }
        />
        <EmptyState
          title="尚无部门"
          description="创建根部门后才能为员工建立档案。"
          action={
            <Button>
              <Plus size={15} />
              创建根部门
            </Button>
          }
        />
      </>
    );
  return (
    <>
      <PageTop
        title="部门"
        description="完整路径用于员工建档、人员选择与历史快照"
        actions={
          <Button>
            <Plus size={15} />
            新增部门
          </Button>
        }
      />
      <div className="admin-split admin-split--tree">
        <section className="admin-panel admin-tree">
          <div className="admin-panel-title">
            <strong>部门结构</strong>
            <IconButton label="刷新部门树">
              <RefreshCw size={15} />
            </IconButton>
          </div>
          <button className="tree-node is-selected">
            <ChevronDown size={14} />
            <Building2 size={15} />
            <span>总部</span>
            <small>124</small>
          </button>
          <div className="tree-children">
            <button className="tree-node">
              <ChevronDown size={14} />
              <Building2 size={15} />
              <span>技术中心</span>
              <small>73</small>
            </button>
            <div className="tree-children">
              <button className="tree-node">
                <CircleDot size={10} />
                <span>研发部</span>
                <small>48</small>
              </button>
              <button className="tree-node">
                <CircleDot size={10} />
                <span>产品部</span>
                <small>25</small>
              </button>
            </div>
            <button className="tree-node">
              <CircleDot size={10} />
              <span>人力资源部</span>
              <small>18</small>
            </button>
            <button className="tree-node">
              <CircleDot size={10} />
              <span>财务部</span>
              <small>12</small>
            </button>
          </div>
        </section>
        <section className="admin-panel admin-form-panel">
          <SectionHeader
            title="总部"
            description="总部"
            action={<Status tone="success">启用</Status>}
          />
          <div className="admin-form-grid">
            <Field label="部门名称" value="总部" />
            <Field label="上级部门" value="无（根部门）" type="select" />
            <Field label="完整路径" value="总部" disabled />
          </div>
          {scenario === "cycle" && (
            <Banner title="无法移动部门" tone="danger">
              不能将“总部”移动到其下级“研发部”。
            </Banner>
          )}
          {scenario === "blocked" && (
            <Banner title="停用受阻" tone="danger">
              当前部门包含 124 名员工、4 个直接或间接下级部门。
            </Banner>
          )}
          {scenario === "stale" && (
            <Banner
              title="部门已发生变化"
              tone="warning"
              action={
                <Button variant="secondary">
                  <RefreshCw size={14} />
                  加载最新
                </Button>
              }
            >
              旧页面保存已拒绝，本地输入仍保留。
            </Banner>
          )}
          <div className="admin-impact">
            <h3>影响摘要</h3>
            <dl>
              <div>
                <dt>任意状态员工</dt>
                <dd>124 人</dd>
              </div>
              <div>
                <dt>直接 / 间接下级</dt>
                <dd>4 个</dd>
              </div>
              <div>
                <dt>历史人员快照</dt>
                <dd>不受改名或移动影响</dd>
              </div>
            </dl>
          </div>
          <div className="admin-actions-row">
            <Button variant="danger" onClick={() => openModal("disable")}>
              停用部门
            </Button>
            <Button>保存变更</Button>
          </div>
        </section>
      </div>
    </>
  );
}

function EmployeePage({
  scenario,
  openModal,
  navigateTo,
}: {
  scenario: string;
  openModal: (kind: ModalKind) => void;
  navigateTo: SurfacePrototypeProps["navigateTo"];
}) {
  const rows = [
    [
      "张伟",
      "E1024",
      cell("总部 / 技术中心 / 研发部", "研发工程师"),
      "138****6128",
      <Status tone="success">启用</Status>,
      <Status>员工</Status>,
      <button className="table-action" onClick={() => navigateTo("AD-04")}>
        账号与授权
      </button>,
    ],
    [
      "李娜",
      "E1037",
      "总部 / 技术中心 / 产品部",
      "186****3921",
      <Status tone="success">启用</Status>,
      <Status tone="info">管理员</Status>,
      <button className="table-action" onClick={() => navigateTo("AD-04")}>
        账号与授权
      </button>,
    ],
    [
      "王晨",
      "E1061",
      "总部 / 人力资源部",
      "159****2270",
      scenario === "disabled" ? (
        <Status tone="warning">停用</Status>
      ) : (
        <Status tone="success">启用</Status>
      ),
      <Status>员工</Status>,
      <button className="table-action">查看</button>,
    ],
  ];
  return (
    <>
      <PageTop
        title="员工"
        description="5,000 名员工容量 · 一名员工仅有一个主部门"
        actions={
          <>
            <Button variant="secondary" onClick={() => openModal("import")}>
              <Upload size={15} />
              批量导入
            </Button>
            <Button onClick={() => openModal("create")}>
              <Plus size={15} />
              单个建档
            </Button>
          </>
        }
      />
      {scenario === "partial" && (
        <Banner
          title="文件预览完成"
          tone="warning"
          action={
            <Button onClick={() => openModal("import")}>确认建档 96 人</Button>
          }
        >
          100 行中 96 行可建档，4 行因工号、手机号冲突或未知部门路径跳过。
        </Banner>
      )}
      {scenario === "credential" && (
        <Banner
          title="批量凭据待下载"
          tone="success"
          action={
            <Button onClick={() => navigateTo("AD-03", "expired")}>
              <Download size={15} />
              下载一次
            </Button>
          }
        >
          本批次 96 人 · 剩余 18:42:16 · 首次成功下载后立即失效。
        </Banner>
      )}
      {scenario === "expired" && (
        <Banner title="批量凭据已失效" tone="danger">
          凭据已下载或超过 24 小时，遗失后只能逐人重置。
        </Banner>
      )}
      <FilterBar>
        <input placeholder="姓名 / 工号" defaultValue="" />
        <select defaultValue="全部部门">
          <option>全部部门</option>
          <option>总部 / 技术中心 / 研发部</option>
        </select>
        <select defaultValue="有效员工">
          <option>有效员工</option>
          <option>全部状态</option>
          <option>已停用</option>
        </select>
      </FilterBar>
      {scenario === "empty" ? (
        <EmptyState
          title="尚无员工"
          description="请先确认部门路径，再单个建档或下载模板批量导入。"
          action={
            <Button onClick={() => openModal("create")}>
              <Plus size={15} />
              单个建档
            </Button>
          }
        />
      ) : (
        <DataTable
          headers={[
            "姓名",
            "工号",
            "主部门完整路径",
            "手机号",
            "账号状态",
            "资格",
            "操作",
          ]}
          rows={rows}
        />
      )}
    </>
  );
}

function AccountPage({
  scenario,
  openModal,
}: {
  scenario: string;
  openModal: (kind: ModalKind) => void;
}) {
  const locked =
    scenario === "last-admin" ||
    scenario === "last-ops" ||
    scenario === "disabled";
  return (
    <>
      <PageTop
        eyebrow="组织与员工 / 员工 / E1037"
        title="账号与授权"
        description="李娜 · E1037 · 总部 / 技术中心 / 产品部"
        status={
          <Status tone={scenario === "disabled" ? "warning" : "success"}>
            {scenario === "disabled" ? "停用" : "启用"}
          </Status>
        }
      />
      <div className="admin-settings-grid">
        <section className="admin-panel">
          <SectionHeader
            title="账号安全"
            description="首登改密状态：已完成"
            action={<KeyRound size={18} />}
          />
          <dl className="admin-detail-list">
            <div>
              <dt>登录账号</dt>
              <dd>E1037</dd>
            </div>
            <div>
              <dt>验证手机号</dt>
              <dd>186****3921</dd>
            </div>
            <div>
              <dt>最近登录</dt>
              <dd>2026-08-11 09:32</dd>
            </div>
          </dl>
          <Button variant="secondary" onClick={() => openModal("secret")}>
            <RotateCcw size={14} />
            重置密码
          </Button>
        </section>
        <section className="admin-panel">
          <SectionHeader
            title="小程序绑定"
            description="外部身份标识已脱敏"
            action={<UserRoundCheck size={18} />}
          />
          <div className="setting-row">
            <div>
              <strong>微信小程序</strong>
              <small>已绑定 · 2026-03-18</small>
            </div>
            <Button variant="secondary">解除绑定</Button>
          </div>
        </section>
        <section className="admin-panel">
          <SectionHeader
            title="后台资格"
            description="撤销资格会立即使旧会话失效"
            action={<UserCog size={18} />}
          />
          <div className="setting-row">
            <div>
              <strong>企业管理员</strong>
              <small>当前有效管理员 3 人</small>
            </div>
            <Toggle label="已授予" checked disabled={locked} />
          </div>
          {scenario === "last-admin" && (
            <Banner title="不能撤销最后一名管理员" tone="danger">
              请先向其他有效员工授予管理员资格。
            </Banner>
          )}
        </section>
        <section className="admin-panel">
          <SectionHeader
            title="考试异常处置"
            description="不是独立业务角色"
            action={<ShieldAlert size={18} />}
          />
          <div className="setting-row">
            <div>
              <strong>异常处置授权</strong>
              <small>当前有效授权管理员 2 人</small>
            </div>
            <Toggle label="已授权" checked disabled={locked} />
          </div>
          {scenario === "last-ops" && (
            <Banner title="不能撤销最后一名授权人" tone="danger">
              请先授权另一名有效管理员。
            </Banner>
          )}
        </section>
      </div>
      {scenario === "temporary-password" && (
        <Banner
          title="一次性临时密码"
          tone="success"
          action={<Button variant="secondary">复制</Button>}
        >
          N7v!4mQ2sK · 关闭结果层后不可再次查看。
        </Banner>
      )}
      {scenario === "disabled" && (
        <Banner title="账号已停用" tone="warning">
          禁止授予管理员资格和异常处置授权。
        </Banner>
      )}
    </>
  );
}

function BankPage({
  scenario,
  openModal,
  navigateTo,
}: {
  scenario: string;
  openModal: (kind: ModalKind) => void;
  navigateTo: SurfacePrototypeProps["navigateTo"];
}) {
  const rows = [
    [
      "信息安全题库",
      cell("1,248 题", "更新于 10:28"),
      <Status tone="success">启用</Status>,
      <Toggle label="练习" checked />,
      <Toggle label="模拟" checked />,
      <>
        <button className="table-action" onClick={() => navigateTo("AD-06")}>
          题目管理
        </button>
        <button className="table-action" onClick={() => navigateTo("AD-08")}>
          导入
        </button>
      </>,
    ],
    [
      "企业制度题库",
      cell("436 题", "更新于昨天"),
      <Status tone="success">启用</Status>,
      <Toggle label="练习" checked />,
      <Toggle label="模拟" />,
      <button className="table-action" onClick={() => navigateTo("AD-06")}>
        题目管理
      </button>,
    ],
    [
      "历史安全规范",
      cell("208 题", "更新于 2025-12-01"),
      <Status tone="warning">停用</Status>,
      <Toggle label="练习" disabled />,
      <Toggle label="模拟" disabled />,
      <button className="table-action">查看历史</button>,
    ],
  ];
  return (
    <>
      <PageTop
        title="题库设置"
        description="题库状态、练习开放和模拟开放独立管理"
        actions={
          <Button onClick={() => openModal("create")}>
            <Plus size={15} />
            新建题库
          </Button>
        }
      />
      {scenario === "conflict" && (
        <Banner
          title="保存冲突"
          tone="warning"
          action={<Button variant="secondary">加载最新设置</Button>}
        >
          本地表单已保留，请基于最新状态再次确认。
        </Banner>
      )}
      <FilterBar>
        <input placeholder="题库名称" />
        <select defaultValue="全部状态">
          <option>全部状态</option>
        </select>
        <select defaultValue="全部练习策略">
          <option>全部练习策略</option>
        </select>
      </FilterBar>
      {scenario === "empty" ? (
        <EmptyState
          title="尚无题库"
          description="创建题库后才能维护题目或发起 Excel 导入。"
          action={
            <Button>
              <Plus size={15} />
              新建题库
            </Button>
          }
        />
      ) : (
        <DataTable
          headers={[
            "题库",
            "当前题数",
            "业务状态",
            "练习开放",
            "模拟开放",
            "操作",
          ]}
          rows={rows}
        />
      )}
      {scenario === "disabled" && (
        <Banner title="历史安全规范已停用" tone="warning">
          禁止新练习、新模拟、新导入确认和新考试发布；历史及已发布考试不变。
        </Banner>
      )}
    </>
  );
}

function QuestionsPage({
  scenario,
  navigateTo,
}: {
  scenario: string;
  navigateTo: SurfacePrototypeProps["navigateTo"];
}) {
  const noData = scenario === "no-category" || scenario === "empty";
  return (
    <>
      <PageTop
        eyebrow="题库 / 信息安全题库"
        title="题目管理"
        description="信息安全题库 · 练习开放 · 模拟开放"
        status={
          <Status tone={scenario === "disabled" ? "warning" : "success"}>
            {scenario === "disabled" ? "题库停用" : "题库启用"}
          </Status>
        }
        actions={
          <>
            <Button
              variant="secondary"
              disabled={scenario === "disabled"}
              onClick={() => navigateTo("AD-09")}
            >
              <Upload size={15} />
              Excel 导入
            </Button>
            <Button
              disabled={scenario === "disabled" || scenario === "no-category"}
              onClick={() => navigateTo("AD-07", "new")}
            >
              <Plus size={15} />
              新建题目
            </Button>
          </>
        }
      />
      <div className="admin-split admin-split--tree">
        <section className="admin-panel admin-tree">
          <div className="admin-panel-title">
            <strong>分类与知识点</strong>
            <IconButton label="新增分类">
              <Plus size={15} />
            </IconButton>
          </div>
          {scenario === "no-category" ? (
            <EmptyState
              title="暂无分类"
              description="先创建分类，再维护知识点和题目。"
            />
          ) : (
            <>
              <button className="tree-node is-selected">
                <ChevronDown size={14} />
                <FolderTree size={15} />
                <span>网络安全</span>
                <small>386</small>
              </button>
              <div className="tree-children">
                <button className="tree-node">
                  <CircleDot size={10} />
                  <span>钓鱼邮件</span>
                  <small>126</small>
                </button>
                <button className="tree-node">
                  <CircleDot size={10} />
                  <span>公共 WiFi</span>
                  <small>92</small>
                </button>
                <button className="tree-node">
                  <CircleDot size={10} />
                  <span>VPN</span>
                  <small>168</small>
                </button>
              </div>
              <button className="tree-node">
                <ChevronRight size={14} />
                <FolderTree size={15} />
                <span>数据安全</span>
                <small>472</small>
              </button>
              <button className="tree-node">
                <ChevronRight size={14} />
                <FolderTree size={15} />
                <span>密码安全</span>
                <small>390</small>
              </button>
            </>
          )}
        </section>
        <section className="admin-panel">
          <FilterBar>
            <input placeholder="题干关键词" />
            <select>
              <option>全部题型</option>
            </select>
            <select>
              <option>全部难度</option>
            </select>
            <select>
              <option>全部状态</option>
            </select>
          </FilterBar>
          {scenario === "changed" && (
            <Banner title="题目已更新" tone="warning">
              列表已刷新为 V6，旧页面的停用请求未执行。
            </Banner>
          )}
          {noData ? (
            <EmptyState
              title={scenario === "empty" ? "当前分类暂无题目" : "请先创建分类"}
              description={
                scenario === "empty"
                  ? "可以新建题目或从固定模板导入。"
                  : "知识点不能脱离分类存在。"
              }
            />
          ) : (
            <DataTable
              compact
              headers={[
                "题干摘要",
                "题型",
                "分类 / 知识点",
                "难度",
                "分值",
                "版本",
                "状态",
                "操作",
              ]}
              rows={[
                [
                  cell("以下哪项是识别钓鱼邮件的有效方法？", "更新于 10:12"),
                  "单选",
                  cell("网络安全", "钓鱼邮件"),
                  "中等",
                  "1",
                  "V5",
                  <Status tone="success">启用</Status>,
                  <button
                    className="table-action"
                    onClick={() => navigateTo("AD-07")}
                  >
                    查看/修订
                  </button>,
                ],
                [
                  cell("公共 WiFi 场景下必须使用企业 VPN。", "更新于昨天"),
                  "判断",
                  cell("网络安全", "公共 WiFi"),
                  "简单",
                  "1",
                  "V2",
                  <Status tone="success">启用</Status>,
                  <button
                    className="table-action"
                    onClick={() => navigateTo("AD-07")}
                  >
                    查看/修订
                  </button>,
                ],
                [
                  cell("可用于增强账号安全的措施包括？"),
                  "多选",
                  cell("密码安全", "多因素认证"),
                  "困难",
                  "2",
                  "V4",
                  <Status tone="warning">停用</Status>,
                  <button
                    className="table-action"
                    onClick={() => navigateTo("AD-07", "history")}
                  >
                    版本
                  </button>,
                ],
              ]}
            />
          )}
        </section>
      </div>
    </>
  );
}

function QuestionEditor({
  scenario,
  navigateTo,
  openModal,
}: {
  scenario: string;
  navigateTo: SurfacePrototypeProps["navigateTo"];
  openModal: (kind: ModalKind) => void;
}) {
  const readonly = scenario === "history" || scenario === "disabled";
  return (
    <>
      <PageTop
        eyebrow="题库 / 信息安全题库 / 网络安全"
        title={scenario === "new" ? "新建题目" : "单题与版本"}
        description="题干、选项和解析仅支持纯文本与换行"
        status={
          <Status tone={scenario === "disabled" ? "warning" : "success"}>
            {scenario === "new"
              ? "新题"
              : scenario === "history"
                ? "V4 历史版本"
                : scenario === "disabled"
                  ? "已停用"
                  : "V5 当前版本"}
          </Status>
        }
        actions={
          <Button variant="ghost" onClick={() => navigateTo("AD-06")}>
            <ChevronLeft size={15} />
            返回题目列表
          </Button>
        }
      />
      {scenario === "conflict" && (
        <Banner
          title="保存时已出现 V6"
          tone="danger"
          action={<Button variant="secondary">加载最新版本</Button>}
        >
          当前输入已保留，必须重新基于最新版本修订。
        </Banner>
      )}
      <div className="admin-editor-layout">
        <section className="admin-panel admin-form-panel">
          <div className="admin-form-grid admin-form-grid--3">
            <Field label="题库" value="信息安全题库" disabled />
            <Field
              label="分类"
              value="网络安全"
              type="select"
              disabled={readonly}
            />
            <Field
              label="知识点（可空）"
              value="钓鱼邮件"
              type="select"
              disabled={readonly}
            />
          </div>
          <div className="admin-form-grid">
            <Field
              label="题型"
              value="单选"
              type="select"
              disabled={readonly}
            />
            <Field
              label="难度"
              value="中等"
              type="select"
              disabled={readonly}
            />
            <Field label="默认分值" value="1" disabled={readonly} />
          </div>
          <Field
            label="题干"
            value="以下哪项是识别钓鱼邮件的有效方法？"
            type="textarea"
            disabled={readonly}
          />
          <div className="admin-options">
            <Field
              label="选项 A"
              value="检查发件地址与链接域名"
              disabled={readonly}
            />
            <Field
              label="选项 B"
              value="只要有公司 Logo 就可信"
              disabled={readonly}
            />
            <Field
              label="选项 C"
              value="立即下载所有附件"
              disabled={readonly}
            />
            <Field
              label="选项 D"
              value="直接回复提供账号密码"
              disabled={readonly}
            />
          </div>
          <Field label="正确答案" value="A" disabled={readonly} />
          <Field
            label="答案解析"
            value="钓鱼邮件常使用相似域名和伪造发件地址，应先核验来源。"
            type="textarea"
            disabled={readonly}
          />
          <div className="admin-actions-row">
            <Button variant="secondary" onClick={() => openModal("disable")}>
              复制为新题
            </Button>
            <Button variant="danger" disabled={readonly}>
              停用题目
            </Button>
            <Button disabled={readonly}>
              {scenario === "new" ? "保存第一个版本" : "保存为新版本"}
            </Button>
          </div>
        </section>
        <aside className="admin-panel admin-version">
          <SectionHeader title="版本记录" description="最新版本在前" />
          <button className={scenario !== "history" ? "is-active" : ""}>
            <span>V5 · 当前</span>
            <small>周敏 · 今天 10:12</small>
            <b>修订答案解析</b>
          </button>
          <button className={scenario === "history" ? "is-active" : ""}>
            <span>V4</span>
            <small>李娜 · 2026-05-20</small>
            <b>调整难度与分值</b>
          </button>
          <button>
            <span>V3</span>
            <small>周敏 · 2026-02-08</small>
            <b>题干措辞修订</b>
          </button>
          <button>
            <span>V1</span>
            <small>系统导入 · 2025-12-01</small>
            <b>创建题目</b>
          </button>
        </aside>
      </div>
    </>
  );
}

function ImportTasks({
  scenario,
  navigateTo,
}: {
  scenario: string;
  navigateTo: SurfacePrototypeProps["navigateTo"];
}) {
  const rows = [
    [
      "IMP-20260811-003",
      cell("信息安全题库", "security_questions_v4.xlsx"),
      <Status tone="warning">待确认</Status>,
      "1,000 / 972 / 28 / -",
      "周敏",
      "今天 10:42",
      <button
        className="table-action"
        onClick={() => navigateTo("AD-09", "partial")}
      >
        查看预览
      </button>,
    ],
    [
      "IMP-20260811-002",
      cell("企业制度题库", "policy.xlsx"),
      <Status tone="info">校验中</Status>,
      "800 / - / - / -",
      "李娜",
      "今天 09:18",
      <button className="table-action">查看状态</button>,
    ],
    [
      "IMP-20260810-008",
      cell("信息安全题库", "questions_final.xlsx"),
      <Status tone="success">导入成功</Status>,
      "436 / 430 / 6 / 430",
      "周敏",
      "昨天 16:31",
      <button className="table-action">结果</button>,
    ],
    [
      "IMP-20260702-014",
      cell("信息安全题库", "old_template.xlsx"),
      <Status tone="danger">需重新校验</Status>,
      "300 / 281 / 19 / -",
      "李娜",
      "07-02 11:04",
      <button className="table-action">重新校验</button>,
    ],
  ];
  return (
    <>
      <PageTop
        title="导题任务"
        description="单题库固定版本 .xlsx · 最多 1,000 行 / 10 MB"
        actions={
          <Button onClick={() => navigateTo("AD-09")}>
            <Upload size={15} />
            新建导入
          </Button>
        }
      />
      {scenario !== "standard" && (
        <Banner
          title={
            scenario === "validating"
              ? "任务正在校验"
              : scenario === "revalidate"
                ? "任务需重新校验"
                : scenario === "success"
                  ? "导入完成"
                  : "文件已清理"
          }
          tone={
            scenario === "success"
              ? "success"
              : scenario === "expired"
                ? "danger"
                : "warning"
          }
        >
          {scenario === "expired"
            ? "原文件和错误文件不可下载，数量与审计摘要继续保留。"
            : "任务 IMP-20260811-003 · 目标题库始终固定为信息安全题库。"}
        </Banner>
      )}
      <FilterBar>
        <select>
          <option>全部题库</option>
        </select>
        <select>
          <option>全部状态</option>
        </select>
        <input placeholder="操作管理员" />
        <input type="date" />
      </FilterBar>
      <DataTable
        headers={[
          "任务标识",
          "题库 / 文件",
          "状态",
          "总数 / 可导入 / 错误 / 实际",
          "操作人",
          "最后活动",
          "操作",
        ]}
        rows={rows}
      />
    </>
  );
}

function ImportPreview({
  scenario,
  navigateTo,
  openModal,
}: {
  scenario: string;
  navigateTo: SurfacePrototypeProps["navigateTo"];
  openModal: (kind: ModalKind) => void;
}) {
  const disabled = [
    "file-failure",
    "all-invalid",
    "revalidate",
    "confirming",
  ].includes(scenario);
  const good =
    scenario === "all-invalid" || scenario === "file-failure" ? 0 : 972;
  const bad =
    scenario === "all-invalid" ? 1000 : scenario === "file-failure" ? 0 : 28;
  return (
    <>
      <PageTop
        eyebrow="题库 / 导题任务 / IMP-20260811-003"
        title="校验预览"
        description="信息安全题库 · security_questions_v4.xlsx · 模板 V1.0"
        actions={
          <Button variant="ghost" onClick={() => navigateTo("AD-08")}>
            <ChevronLeft size={15} />
            返回任务
          </Button>
        }
      />
      {scenario === "file-failure" && (
        <Banner title="文件级校验失败" tone="danger">
          工作表或表头不符合当前模板，正式题库无任何写入。
        </Banner>
      )}
      {scenario === "revalidate" && (
        <Banner title="预览依据已变化" tone="warning">
          题库状态或目录已更新，请返回任务重新校验。
        </Banner>
      )}
      {scenario === "confirming" && (
        <Banner title="确认处理中" tone="info">
          重新打开将查询同一任务结果，不会启动第二次写入。
        </Banner>
      )}
      <div className="admin-metrics admin-metrics--4">
        <Metric
          label="总数据"
          value={scenario === "file-failure" ? "—" : "1,000"}
          hint="不含表头"
        />
        <Metric
          label="可导入"
          value={String(good)}
          tone={good ? "success" : "neutral"}
        />
        <Metric
          label="不可导入"
          value={String(bad)}
          tone={bad ? "danger" : "neutral"}
        />
        <Metric
          label="待建目录"
          value={good ? "4" : "0"}
          hint="2 分类 · 2 知识点"
          tone="warning"
        />
      </div>
      <div className="admin-tabs">
        <button className="is-active">
          可导入数据 <b>{good}</b>
        </button>
        <button>
          不可导入数据 <b>{bad}</b>
        </button>
        <button>
          待建层级 <b>{good ? 4 : 0}</b>
        </button>
      </div>
      {scenario === "file-failure" ? (
        <EmptyState
          icon="error"
          title="无法生成行级预览"
          description="请下载当前模板并重新上传未加密的 .xlsx 文件。"
        />
      ) : (
        <DataTable
          compact
          headers={[
            "原行号",
            "分类",
            "知识点",
            "题型",
            "题干摘要",
            "难度",
            "分值",
            "校验",
          ]}
          rows={[
            [
              2,
              "网络安全",
              "钓鱼邮件",
              "单选",
              "以下哪项是识别钓鱼邮件的有效方法？",
              "中等",
              "1",
              <Status tone="success">可导入</Status>,
            ],
            [
              3,
              "数据安全（待建）",
              "数据分级（待建）",
              "多选",
              "敏感数据处理应遵循哪些要求？",
              "中等",
              "2",
              <Status tone="warning">待建层级</Status>,
            ],
            [
              25,
              "密码安全",
              "-",
              "判断",
              "密码可以长期不更换。",
              "中等",
              "1",
              <Status tone="danger">答案格式错误</Status>,
            ],
          ]}
        />
      )}
      <div className="admin-sticky-action">
        <div>
          <strong>确认后将导入全部 {good} 行合法数据</strong>
          <span>同时创建 4 个待建分类/知识点；不可逐行选择</span>
        </div>
        <Button variant="secondary">
          <FileDown size={15} />
          下载错误结果
        </Button>
        <Button variant="ghost" onClick={() => navigateTo("AD-08")}>
          取消任务
        </Button>
        <Button disabled={disabled} onClick={() => openModal("import")}>
          <Check size={15} />
          确认导入
        </Button>
      </div>
    </>
  );
}

function ExamsPage({
  scenario,
  navigateTo,
}: {
  scenario: string;
  navigateTo: SurfacePrototypeProps["navigateTo"];
}) {
  const rows = [
    [
      cell("2026 年信息安全考试", "EXAM-2026-008"),
      <>
        <Status tone="success">开放开卷</Status> <Status>正常</Status>
      </>,
      cell("08-11 09:00", "停止新开卷 08-12 18:00"),
      "132",
      "50 / 100",
      cell("未参加 31 · 考试中 8", "已交卷 93 · 通过 81"),
      <button
        className="table-action"
        onClick={() =>
          navigateTo("AD-13", scenario === "paused" ? "paused" : "standard")
        }
      >
        过程监控
      </button>,
    ],
    [
      cell("新员工制度考试", "EXAM-2026-007"),
      <>
        <Status tone="warning">收尾中</Status>{" "}
        <Status tone="warning">正常</Status>
      </>,
      cell("08-10 08:00", "停止新开卷 08-11 10:00"),
      "58",
      "40 / 80",
      cell("在途 0", "观察剩余 00:12"),
      <button
        className="table-action"
        onClick={() => navigateTo("AD-13", "closing")}
      >
        查看收尾
      </button>,
    ],
    [
      cell("第三季度合规考试", "草稿"),
      <Status>草稿</Status>,
      "未发布",
      "—",
      "60 / 120",
      "配置 4/5",
      <button className="table-action" onClick={() => navigateTo("AD-11")}>
        继续配置
      </button>,
    ],
    [
      cell("旧版安全规范考试", "EXAM-2026-003"),
      <Status tone="danger">已取消</Status>,
      cell("06-02 09:00", "取消于 06-02 11:24"),
      "88",
      "50 / 100",
      "不计入官方统计",
      <button
        className="table-action"
        onClick={() => navigateTo("AD-13", "canceled")}
      >
        查看历史
      </button>,
    ],
  ];
  return (
    <>
      <PageTop
        title="考试列表"
        description="生命周期和运行状态独立展示"
        actions={
          <Button onClick={() => navigateTo("AD-11")}>
            <Plus size={15} />
            创建考试
          </Button>
        }
      />
      {scenario === "paused" && (
        <Banner
          title="2026 年信息安全考试暂停中"
          tone="danger"
          action={
            <Button
              variant="secondary"
              onClick={() => navigateTo("AD-13", "pending")}
            >
              查看故障事件
            </Button>
          }
        >
          生命周期仍为开放开卷，平台能力因监控事件暂停。
        </Banner>
      )}
      {scenario === "closing" && (
        <Banner title="新员工制度考试收尾中" tone="warning">
          新开卷已停止，20 秒整场结束观察剩余 00:12，无在途尝试。
        </Banner>
      )}
      <FilterBar>
        <input placeholder="考试名称" />
        <select>
          <option>全部生命周期</option>
        </select>
        <select>
          <option>全部运行状态</option>
        </select>
        <input type="date" />
      </FilterBar>
      {scenario === "empty" ? (
        <EmptyState
          title="尚无考试"
          description="创建草稿后使用五步向导完成配置。"
          action={
            <Button onClick={() => navigateTo("AD-11")}>
              <Plus size={15} />
              创建考试
            </Button>
          }
        />
      ) : (
        <DataTable
          headers={[
            "考试",
            "生命周期 / 运行",
            "开放时间",
            "应考",
            "题数 / 总分",
            "参与快照",
            "操作",
          ]}
          rows={rows}
        />
      )}
    </>
  );
}

function WizardPage({
  scenario,
  step,
  setStep,
  navigateTo,
}: {
  scenario: string;
  step: number;
  setStep: (step: number) => void;
  navigateTo: SurfacePrototypeProps["navigateTo"];
}) {
  const frozen = scenario === "frozen";
  const steps = ["基础信息", "组卷规则", "应考人员", "结果展示", "复核"];
  return (
    <>
      <PageTop
        eyebrow="考试 / 2026 年信息安全考试"
        title="考试配置"
        description="草稿自动保留当前步骤，发布后形成不可变快照"
        status={
          <Status tone={frozen ? "info" : "neutral"}>
            {frozen ? "已发布 · 只读" : "草稿"}
          </Status>
        }
        actions={
          frozen ? (
            <Button onClick={() => navigateTo("AD-13")}>进入过程监控</Button>
          ) : (
            <Button variant="secondary">保存草稿</Button>
          )
        }
      />
      <div className="admin-stepper">
        {steps.map((label, index) => (
          <button
            key={label}
            className={
              index === step ? "is-active" : index < step ? "is-done" : ""
            }
            onClick={() => setStep(index)}
          >
            <span>{index < step ? <Check size={14} /> : index + 1}</span>
            <b>{label}</b>
          </button>
        ))}
      </div>
      {scenario === "incomplete" && (
        <Banner title="第 2 步有未完成规则" tone="warning">
          规则行 3 缺少抽题数量，草稿可保存但不能发布。
        </Banner>
      )}
      {scenario === "empty-people" && (
        <Banner title="应考人员为空" tone="danger">
          人员范围去重后至少需要 1 名有效员工。
        </Banner>
      )}
      {scenario === "pass-over" && (
        <Banner title="及格分高于总分" tone="danger">
          当前总分 100，及格分 120，请返回第 1 步修正。
        </Banner>
      )}
      <section className="admin-panel admin-wizard-body">
        {step === 0 && (
          <>
            <SectionHeader
              title="基础信息"
              description="停止新开卷时间不是员工个人到期时间"
            />
            <div className="admin-form-grid">
              <Field
                label="考试名称"
                value="2026 年信息安全考试"
                disabled={frozen}
              />
              <Field
                label="考试说明"
                value="请诚信完成本次年度信息安全考核。"
                disabled={false}
              />
            </div>
            <div className="admin-form-grid admin-form-grid--3">
              <Field
                label="开放开始"
                value="2026-08-11 09:00"
                disabled={frozen}
              />
              <Field
                label="停止新开卷"
                value="2026-08-12 18:00"
                disabled={frozen}
              />
              <Field label="单次时长（分钟）" value="60" disabled={frozen} />
            </div>
            <div className="admin-form-grid">
              <Field label="最大考试次数" value="2" disabled={frozen} />
              <Field
                label="及格分"
                value={scenario === "pass-over" ? "120" : "80"}
                disabled={frozen}
              />
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <SectionHeader
              title="原子组卷规则"
              description="每行是所有筛选维度的交集；跨行候选不得重叠"
              action={
                <Button variant="secondary" disabled={frozen}>
                  <Plus size={14} />
                  新增规则行
                </Button>
              }
            />
            <DataTable
              compact
              headers={[
                "#",
                "题库",
                "分类",
                "知识点",
                "题型",
                "难度",
                "抽题数",
                "单题分值",
                "候选数",
                "操作",
              ]}
              rows={[
                [
                  1,
                  "信息安全题库",
                  "网络安全",
                  "全部",
                  "单选",
                  "中等",
                  "20",
                  "2",
                  <Status tone="success">186</Status>,
                  <IconButton label="更多">
                    <MoreHorizontal size={15} />
                  </IconButton>,
                ],
                [
                  2,
                  "信息安全题库",
                  "数据安全",
                  "全部",
                  "多选",
                  "全部",
                  "10",
                  "3",
                  <Status tone="success">74</Status>,
                  <IconButton label="更多">
                    <MoreHorizontal size={15} />
                  </IconButton>,
                ],
                [
                  3,
                  "信息安全题库",
                  "密码安全",
                  "全部",
                  "判断",
                  "简单",
                  scenario === "incomplete" ? (
                    <span className="field-error">必填</span>
                  ) : (
                    "20"
                  ),
                  "1.5",
                  <Status tone="success">91</Status>,
                  <IconButton label="更多">
                    <MoreHorizontal size={15} />
                  </IconButton>,
                ],
              ]}
            />
            <div className="admin-totals">
              <span>规则 3 / 50</span>
              <span>题库 1 / 10</span>
              <strong>总题数 50</strong>
              <strong>总分 100</strong>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <SectionHeader
              title="应考人员"
              description="全部员工、部门含下级、指定员工取并集去重"
            />
            <div className="admin-form-grid">
              <Field label="人员范围" value="指定部门" type="select" />
              <Field
                label="部门完整路径"
                value="总部 / 技术中心"
                type="select"
              />
            </div>
            <div className="admin-preview">
              <div>
                <Users size={20} />
                <span>
                  <strong>
                    {scenario === "empty-people" ? "0" : "132"} 人
                  </strong>
                  <small>有效人员去重预览</small>
                </span>
              </div>
              <Button variant="secondary">查看人员明细</Button>
            </div>
            <DataTable
              compact
              headers={["姓名", "工号", "部门完整路径"]}
              rows={
                scenario === "empty-people"
                  ? []
                  : [
                      ["张伟", "E1024", "总部 / 技术中心 / 研发部"],
                      ["李娜", "E1037", "总部 / 技术中心 / 产品部"],
                      ["赵凯", "E1098", "总部 / 技术中心 / 研发部"],
                    ]
              }
            />
          </>
        )}
        {step === 3 && (
          <>
            <SectionHeader
              title="结果展示"
              description="公开开关不得突破系统强制最早公开下限"
            />
            <div className="admin-form-grid">
              <Field
                label="汇总公开时机"
                value="本次提交后"
                type="select"
                disabled={frozen}
              />
              <div className="admin-toggle-grid">
                <Toggle label="显示总成绩" checked disabled={frozen} />
                <Toggle label="显示是否通过" checked disabled={frozen} />
                <Toggle label="显示正确 / 错误数" checked disabled={frozen} />
                <Toggle label="显示标准答案" disabled={frozen} />
                <Toggle label="显示答案解析" disabled={frozen} />
              </div>
            </div>
            <Banner title="答案与解析有强制公开下限" tone="info">
              即使开启，也必须等整场结束且员工无剩余合法机会后才可见；“是否通过”未公开时隐藏结构化及格分。
            </Banner>
          </>
        )}
        {step === 4 && (
          <>
            <SectionHeader
              title="发布复核"
              description="确认四步配置完整后进入发布预检"
            />
            <div className="admin-review-list">
              <button onClick={() => setStep(0)}>
                <CheckCircle2 size={18} />
                <span>
                  <b>基础信息</b>
                  <small>
                    08-11 09:00 开放 · 08-12 18:00 停止新开卷 · 60 分钟 · 2 次
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
              <button onClick={() => setStep(1)}>
                <CheckCircle2 size={18} />
                <span>
                  <b>组卷规则</b>
                  <small>3 条 · 50 题 · 100 分 · 及格 80</small>
                </span>
                <ChevronRight size={16} />
              </button>
              <button onClick={() => setStep(2)}>
                <CheckCircle2 size={18} />
                <span>
                  <b>应考人员</b>
                  <small>132 名有效员工 · 人员快照将在发布时冻结</small>
                </span>
                <ChevronRight size={16} />
              </button>
              <button onClick={() => setStep(3)}>
                <CheckCircle2 size={18} />
                <span>
                  <b>结果展示</b>
                  <small>提交后展示汇总 · 答案与解析关闭</small>
                </span>
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </section>
      <div className="admin-sticky-action admin-sticky-action--wizard">
        <Button
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep(Math.max(0, step - 1))}
        >
          <ChevronLeft size={15} />
          上一步
        </Button>
        <div>
          <strong>第 {step + 1} / 5 步</strong>
          <span>{steps[step]}</span>
        </div>
        {step < 4 ? (
          <Button onClick={() => setStep(Math.min(4, step + 1))}>
            保存并下一步
            <ChevronRight size={15} />
          </Button>
        ) : (
          <Button
            disabled={
              scenario === "incomplete" ||
              scenario === "empty-people" ||
              scenario === "pass-over"
            }
            onClick={() => navigateTo("AD-12")}
          >
            进入发布预检
            <ChevronRight size={15} />
          </Button>
        )}
      </div>
    </>
  );
}

function PrecheckPage({
  scenario,
  navigateTo,
  openModal,
}: {
  scenario: string;
  navigateTo: SurfacePrototypeProps["navigateTo"];
  openModal: (kind: ModalKind) => void;
}) {
  const failed = scenario === "failed";
  const ready = scenario === "passed" || scenario === "standard";
  return (
    <>
      <PageTop
        eyebrow="考试 / 2026 年信息安全考试"
        title="发布预检"
        description="二次确认时重新校验全部冻结依据"
        status={
          <Status tone={failed ? "danger" : ready ? "success" : "warning"}>
            {failed ? "未通过" : ready ? "预检通过" : "检查中"}
          </Status>
        }
        actions={
          <Button
            variant="ghost"
            onClick={() => navigateTo("AD-11", "standard")}
          >
            <ChevronLeft size={15} />
            返回配置
          </Button>
        }
      />
      {scenario === "paused" && (
        <Banner title="平台暂停中" tone="danger">
          恢复后必须重新预检，当前成果不能转为发布。
        </Banner>
      )}
      {scenario === "stale" && (
        <Banner title="预检依据已变化" tone="warning">
          题库或人员状态更新，原通过标识已失效。
        </Banner>
      )}
      {scenario === "publishing" && (
        <Banner title="发布处理中" tone="info">
          重复操作将查询同一发布结果，不生成第二个冻结版本。
        </Banner>
      )}
      <section className="admin-panel admin-precheck">
        <div className="admin-check-grid">
          {[
            "配置完整性",
            "时间窗口",
            "人员快照",
            "规则容量",
            "候选题池",
            "总分与及格分",
          ].map((label, index) => (
            <div
              key={label}
              className={failed && index === 4 ? "is-failed" : ""}
            >
              {scenario === "checking" ? (
                <Clock3 size={17} />
              ) : failed && index === 4 ? (
                <XCircle size={17} />
              ) : (
                <CheckCircle2 size={17} />
              )}
              <span>
                <b>{label}</b>
                <small>
                  {failed && index === 4
                    ? "2 项阻断"
                    : scenario === "checking"
                      ? "检查中…"
                      : "通过"}
                </small>
              </span>
            </div>
          ))}
        </div>
        {failed ? (
          <>
            <SectionHeader
              title="规则阻断项"
              description="一次展示全部已知问题"
            />
            <DataTable
              headers={[
                "规则行",
                "筛选条件",
                "要求数",
                "可用数",
                "缺口",
                "重叠行",
                "处理",
              ]}
              rows={[
                [
                  2,
                  "数据安全 / 多选 / 全部难度",
                  "10",
                  "7",
                  "3",
                  "—",
                  <button
                    className="table-action"
                    onClick={() => navigateTo("AD-11", "incomplete")}
                  >
                    返回第 2 步
                  </button>,
                ],
                [
                  3,
                  "密码安全 / 判断 / 简单",
                  "20",
                  "91",
                  "—",
                  "行 1",
                  <button
                    className="table-action"
                    onClick={() => navigateTo("AD-11", "incomplete")}
                  >
                    定位重叠
                  </button>,
                ],
              ]}
            />
          </>
        ) : (
          <>
            <SectionHeader
              title="冻结摘要"
              description="发布成功后除考试说明外不可原地修改"
            />
            <dl className="admin-summary-grid">
              <div>
                <dt>考试时间</dt>
                <dd>08-11 09:00 至 08-12 18:00</dd>
              </div>
              <div>
                <dt>单次 / 次数</dt>
                <dd>60 分钟 / 2 次</dd>
              </div>
              <div>
                <dt>题数 / 总分 / 及格</dt>
                <dd>50 / 100 / 80</dd>
              </div>
              <div>
                <dt>人员快照</dt>
                <dd>132 人</dd>
              </div>
              <div>
                <dt>规则 / 候选版本</dt>
                <dd>3 条 / 351 个版本</dd>
              </div>
              <div>
                <dt>公开策略</dt>
                <dd>提交后汇总，答案解析关闭</dd>
              </div>
            </dl>
          </>
        )}
      </section>
      <div className="admin-sticky-action">
        <div>
          <strong>
            {failed ? "发布被 2 个问题阻断" : "全部发布检查已通过"}
          </strong>
          <span>冻结规则、人员、候选版本、分值和展示策略</span>
        </div>
        <Button variant="secondary">
          <RefreshCw size={15} />
          重新预检
        </Button>
        <Button disabled={!ready} onClick={() => openModal("publish")}>
          <LockKeyhole size={15} />
          确认冻结并发布
        </Button>
      </div>
    </>
  );
}

const outageLabels: Record<
  string,
  { label: string; tone: Tone; note: string }
> = {
  triggered: {
    label: "已触发",
    tone: "danger",
    note: "等待技术恢复和健康检查，影响区间仍开放。",
  },
  pending: {
    label: "待确认",
    tone: "warning",
    note: "提案 V3 已封闭，可由授权管理员确认或驳回。",
  },
  review: {
    label: "系统复核中",
    tone: "info",
    note: "提案 V2 已驳回，考试保持暂停。",
  },
  confirmed: {
    label: "已确认",
    tone: "success",
    note: "补时 18 分 42 秒已原子执行，重复确认不叠加。",
  },
  closed: {
    label: "已关闭",
    tone: "neutral",
    note: "受影响考试均已取消且技术服务已恢复。",
  },
};

function MonitorPage({
  scenario,
  navigateTo,
  openModal,
}: {
  scenario: string;
  navigateTo: SurfacePrototypeProps["navigateTo"];
  openModal: (kind: ModalKind) => void;
}) {
  const outage = outageLabels[scenario];
  const locked = scenario === "result-locked";
  const canceled = scenario === "canceled" || scenario === "closed";
  return (
    <>
      <PageTop
        eyebrow="考试 / 2026 年信息安全考试"
        title="过程监控"
        description="发布版本 PV-20260810-001 · 服务端状态最后更新 10:46:12"
        status={
          <>
            <Status
              tone={
                canceled
                  ? "danger"
                  : scenario === "closing"
                    ? "warning"
                    : "success"
              }
            >
              {canceled
                ? "已取消"
                : scenario === "closing"
                  ? "收尾中"
                  : "开放开卷"}
            </Status>
            <Status
              tone={
                scenario === "paused" ||
                (outage && !["confirmed", "closed"].includes(scenario))
                  ? "danger"
                  : "success"
              }
            >
              {scenario === "paused" ||
              (outage && !["confirmed", "closed"].includes(scenario))
                ? "暂停中"
                : "正常"}
            </Status>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                navigateTo(
                  "AD-14",
                  locked ? "locked" : canceled ? "canceled" : "standard",
                )
              }
            >
              <FileSpreadsheet size={15} />
              成绩统计
            </Button>
            <IconButton label="刷新状态">
              <RefreshCw size={16} />
            </IconButton>
          </>
        }
      />
      {scenario === "closing" && (
        <Banner title="整场结束观察中 · 00:12" tone="warning">
          新开卷已停止。无在途尝试，仍需完成 20
          秒观察且确认运行正常、无待处置故障。
        </Banner>
      )}
      {scenario === "paused" && (
        <Banner title="平台运行暂停" tone="danger">
          暂停开始 10:23:18 · 在途尝试 8 · 开卷、保存、交卷与披露能力受影响。
        </Banner>
      )}
      {locked && (
        <Banner
          title="严重一致性故障：官方结果已锁定"
          tone="danger"
          action={
            <Button variant="danger" onClick={() => openModal("cancel-exam")}>
              取消整场考试
            </Button>
          }
        >
          观察窗失守导致 2
          次误自动交卷。统计、导出和继续披露全部锁定，只能整场取消后人工新建考试。
        </Banner>
      )}
      {canceled && (
        <Banner title="考试已取消" tone="danger">
          在途尝试已终止，完成结果失去官方效力，答案与解析停止访问。
        </Banner>
      )}
      <div className="admin-monitor-strip">
        <div>
          <span>开放开始</span>
          <b>08-11 09:00</b>
        </div>
        <div>
          <span>当前停止新开卷</span>
          <b>
            {scenario === "confirmed"
              ? "08-12 18:18:42（原 18:00）"
              : "08-12 18:00"}
          </b>
        </div>
        <div>
          <span>单次时长 / 次数</span>
          <b>60 分钟 / 2 次</b>
        </div>
        <div>
          <span>结束阻断</span>
          <b>
            {scenario === "closing"
              ? "观察窗 00:12"
              : outage && !["confirmed", "closed"].includes(scenario)
                ? "待处置故障"
                : "无"}
          </b>
        </div>
      </div>
      <section className="admin-metric-section">
        <div className="admin-section-label">
          <strong>参与进度</strong>
          <span>
            {locked ? "仅展示参与事实，官方结果已冻结" : "与结果进度独立"}
          </span>
        </div>
        <div className="admin-metrics admin-metrics--5">
          <Metric label="应考" value="132" />
          <Metric label="未参加" value="31" />
          <Metric label="考试中" value="8" tone="info" />
          <Metric label="已交卷" value="91" tone="success" />
          <Metric label="已参加无有效交卷" value="2" tone="warning" />
        </div>
      </section>
      {!locked && (
        <section className="admin-metric-section">
          <div className="admin-section-label">
            <strong>结果进度</strong>
            <span>异常关注不计入人数守恒</span>
          </div>
          <div className="admin-metrics admin-metrics--5">
            <Metric label="待定" value="39" />
            <Metric label="已通过" value="81" tone="success" />
            <Metric label="未通过" value="10" tone="danger" />
            <Metric label="无有效成绩" value="2" tone="warning" />
            <Metric label="异常关注" value="3" tone="danger" hint="独立标记" />
          </div>
        </section>
      )}
      {outage && (
        <section className="admin-panel admin-outage">
          <SectionHeader
            title={`故障事件 OUT-20260811-02`}
            description="仅由监控创建，证据与提案不可编辑"
            action={<Status tone={outage.tone}>{outage.label}</Status>}
          />
          <Banner title={outage.note} tone={outage.tone}>
            监控证据 E4 · 影响区间 10:23:18-10:42:00 · 影响考试 3 场 / 尝试 46
            次
          </Banner>
          <dl className="admin-summary-grid">
            <div>
              <dt>候选开始</dt>
              <dd>10:23:18</dd>
            </div>
            <div>
              <dt>技术恢复</dt>
              <dd>{scenario === "triggered" ? "待检测" : "10:42:00"}</dd>
            </div>
            <div>
              <dt>当前提案</dt>
              <dd>{scenario === "review" ? "V2 已驳回" : "V3"}</dd>
            </div>
            <div>
              <dt>补偿结果</dt>
              <dd>
                {scenario === "confirmed"
                  ? "+18:42"
                  : scenario === "closed"
                    ? "无需补偿（考试已取消）"
                    : "待确认"}
              </dd>
            </div>
          </dl>
          {scenario === "pending" && (
            <div className="admin-actions-row">
              <Button
                variant="secondary"
                onClick={() => openModal("reject-outage")}
              >
                <X size={15} />
                驳回并复核
              </Button>
              <Button onClick={() => openModal("confirm-outage")}>
                <Check size={15} />
                确认补时并恢复
              </Button>
            </div>
          )}
        </section>
      )}
      <section className="admin-panel">
        <SectionHeader
          title="员工过程"
          description={
            locked
              ? "发布人员快照 · 官方结果状态已冻结"
              : "发布人员快照 · 异常关注与状态分列"
          }
        />
        <DataTable
          compact
          headers={[
            "姓名",
            "工号",
            "部门快照",
            "参与状态",
            "结果状态",
            "在途尝试",
            "异常关注",
            "操作",
          ]}
          rows={[
            [
              "张伟",
              "E1024",
              "总部 / 技术中心 / 研发部",
              <Status tone="info">考试中</Status>,
              locked ? (
                <Status tone="danger">已锁定</Status>
              ) : (
                <Status tone="danger">未通过</Status>
              ),
              "#2",
              <Status>无</Status>,
              <button
                className="table-action"
                disabled={locked}
                onClick={() => navigateTo("AD-15", "in-progress")}
              >
                {locked ? "结果已锁定" : "查看尝试"}
              </button>,
            ],
            [
              "陈晓雨",
              "A02418",
              "总部 / 产品中心 / 产品设计部",
              <Status tone="success">已交卷</Status>,
              locked ? (
                <Status tone="danger">已锁定</Status>
              ) : (
                <Status tone="success">已通过</Status>
              ),
              "—",
              <Status tone="danger">评分重试</Status>,
              <button
                className="table-action"
                disabled={locked}
                onClick={() => navigateTo("AD-15")}
              >
                {locked ? "结果已锁定" : "查看尝试"}
              </button>,
            ],
            [
              "赵凯",
              "E1098",
              "总部 / 技术中心 / 研发部",
              <Status>未参加</Status>,
              locked ? (
                <Status tone="danger">已锁定</Status>
              ) : (
                <Status>待定</Status>
              ),
              "—",
              <Status>无</Status>,
              <button className="table-action" disabled={locked}>
                {locked ? "结果已锁定" : "详情"}
              </button>,
            ],
          ]}
        />
      </section>
      <div className="admin-danger-zone">
        <div>
          <strong>整场取消</strong>
          <span>未开始、开放、收尾和已结束均可取消；取消不可恢复。</span>
        </div>
        <Button
          variant="danger"
          disabled={canceled}
          onClick={() => openModal("cancel-exam")}
        >
          <AlertOctagon size={15} />
          取消考试
        </Button>
      </div>
    </>
  );
}

type ExportRun = "idle" | "queued" | "done" | "downloaded";

function ResultsPage({
  scenario,
  navigateTo,
  openModal,
  exportRun,
  onDownload,
}: {
  scenario: string;
  navigateTo: SurfacePrototypeProps["navigateTo"];
  openModal: (kind: ModalKind) => void;
  exportRun: ExportRun;
  onDownload: () => void;
}) {
  const locked = scenario === "locked";
  const nonfinal = scenario === "nonfinal";
  const canceled = scenario === "canceled";
  if (locked)
    return (
      <>
        <PageTop
          eyebrow="考试 / 2026 年信息安全考试"
          title="成绩统计与导出"
          description="严重一致性故障保护状态"
          status={<Status tone="danger">结果锁定</Status>}
          actions={
            <Button
              variant="secondary"
              onClick={() => navigateTo("AD-13", "result-locked")}
            >
              <ChevronLeft size={15} />
              返回异常处置
            </Button>
          }
        />
        <Banner title="官方成绩、终态统计和导出已锁定" tone="danger">
          页面不展示官方成绩、通过结论或终态统计；重新查询和生成导出均不能绕过。
        </Banner>
        <section className="admin-panel">
          <EmptyState
            icon="error"
            title="官方结果当前不可用"
            description="系统仅保留带风险标识的历史事实。请返回过程监控，填写内部原因与员工可见说明后取消整场考试。"
            action={
              <Button
                variant="danger"
                onClick={() => navigateTo("AD-13", "result-locked")}
              >
                <LockKeyhole size={15} />
                前往整场取消
              </Button>
            }
          />
        </section>
        <section className="admin-panel admin-export">
          <SectionHeader
            title="导出任务"
            description="严重一致性故障期间不生成或下载官方成绩文件"
            action={
              <Button disabled>
                <FileSpreadsheet size={15} />
                生成导出
              </Button>
            }
          />
          <Banner title="导出已冻结" tone="warning">
            已有文件也不能作为官方结果继续下载。
          </Banner>
        </section>
      </>
    );
  if (canceled)
    return (
      <>
        <PageTop
          eyebrow="考试 / 2026 年信息安全考试"
          title="成绩统计与导出"
          description="取消后的非官方历史事实"
          status={<Status tone="danger">已取消 · 无官方结果</Status>}
          actions={
            <Button
              variant="secondary"
              onClick={() => navigateTo("AD-13", "canceled")}
            >
              <ChevronLeft size={15} />
              返回监控
            </Button>
          }
        />
        <Banner title="本场考试结果已失去官方效力" tone="danger">
          仅保留参与和处置历史用于追溯；不计算通过率、官方得分或官方尝试，也不生成官方成绩导出。
        </Banner>
        <section className="admin-metric-section">
          <div className="admin-section-label">
            <strong>取消前参与事实</strong>
            <span>不属于官方结果统计</span>
          </div>
          <div className="admin-metrics admin-metrics--5">
            <Metric label="应考快照" value="132" />
            <Metric label="曾参加" value="101" />
            <Metric label="未参加" value="31" />
            <Metric label="已终止在途" value="8" tone="warning" />
            <Metric label="历史交卷" value="91" />
          </div>
        </section>
        <section className="admin-panel">
          <SectionHeader
            title="历史参与明细"
            description="分数、通过结论和官方标识不在取消口径中展示"
          />
          <DataTable
            compact
            headers={[
              "姓名",
              "工号",
              "部门快照",
              "取消前参与状态",
              "当前效力",
              "操作",
            ]}
            rows={[
              [
                "张伟",
                "E1024",
                "总部 / 技术中心 / 研发部",
                <Status tone="warning">尝试已终止</Status>,
                <Status tone="danger">无官方效力</Status>,
                <button
                  className="table-action"
                  onClick={() => navigateTo("AD-15", "terminated")}
                >
                  历史事实
                </button>,
              ],
              [
                "陈晓雨",
                "A02418",
                "总部 / 产品中心 / 产品设计部",
                <Status>曾交卷</Status>,
                <Status tone="danger">无官方效力</Status>,
                <button
                  className="table-action"
                  onClick={() => navigateTo("AD-15", "terminated")}
                >
                  历史事实
                </button>,
              ],
            ]}
          />
        </section>
        <section className="admin-panel admin-export">
          <SectionHeader
            title="导出任务"
            description="已取消考试不生成官方成绩文件"
            action={
              <Button disabled>
                <FileSpreadsheet size={15} />
                生成导出
              </Button>
            }
          />
          <Banner title="官方导出已关闭" tone="warning">
            审计日志仍可按权限单独查询和导出。
          </Banner>
        </section>
      </>
    );
  return (
    <>
      <PageTop
        eyebrow="考试 / 2026 年信息安全考试"
        title="成绩统计与导出"
        description="一人一行官方成绩 · 全部尝试另表导出"
        status={
          <>
            <Status
              tone={
                canceled || locked ? "danger" : nonfinal ? "warning" : "success"
              }
            >
              {canceled
                ? "已取消"
                : locked
                  ? "结果锁定"
                  : nonfinal
                    ? "非最终统计"
                    : "开放期统计"}
            </Status>
            <Status>及格 80 / 总分 100</Status>
          </>
        }
        actions={
          <Button variant="secondary" onClick={() => navigateTo("AD-13")}>
            <ChevronLeft size={15} />
            返回监控
          </Button>
        }
      />
      {nonfinal && (
        <Banner title="当前统计不是终态" tone="warning">
          20
          秒观察、运行暂停或待处置故障期间不结算缺考，不解锁依赖整场结束的内容。
        </Banner>
      )}
      {locked && (
        <Banner
          title="官方成绩、终态统计和导出已锁定"
          tone="danger"
          action={
            <Button
              variant="danger"
              onClick={() => navigateTo("AD-13", "result-locked")}
            >
              前往整场取消
            </Button>
          }
        >
          仅保留带风险标识的历史事实，重新生成导出也不能绕过。
        </Banner>
      )}
      {scenario === "recalculated" && (
        <Banner title="作废后重算完成" tone="success">
          陈晓雨官方成绩从 96 分更新为 72 分，全场通过人数由 81 更新为 80。
        </Banner>
      )}
      <section className="admin-metric-section">
        <div className="admin-section-label">
          <strong>参与口径</strong>
          <span>应考 = 未参加 + 考试中 + 已交卷 + 已参加无有效交卷</span>
        </div>
        <div className="admin-metrics admin-metrics--5">
          <Metric label="应考" value="132" />
          <Metric label="参加" value="101" />
          <Metric label="未参加" value="31" />
          <Metric label="考试中" value="8" tone="info" />
          <Metric label="已交卷" value="91" tone="success" />
        </div>
      </section>
      <section className="admin-metric-section">
        <div className="admin-section-label">
          <strong>结果口径</strong>
          <span>平均分仅计算有效官方成绩</span>
        </div>
        <div className="admin-metrics admin-metrics--5">
          <Metric label="有效成绩" value="91" />
          <Metric label="无有效成绩" value="2" tone="warning" />
          <Metric
            label="通过 / 未通过"
            value={scenario === "recalculated" ? "80 / 11" : "81 / 10"}
            tone="success"
          />
          <Metric
            label="通过率"
            value={scenario === "recalculated" ? "60.61%" : "61.36%"}
          />
          <Metric
            label="平均 / 最高 / 最低"
            value={
              scenario === "recalculated" ? "85.82 / 100 / 42" : "86 / 100 / 42"
            }
          />
        </div>
      </section>
      <section className="admin-panel">
        <div className="admin-section-toolbar">
          <SectionHeader
            title="员工成绩"
            description="异常关注不改变参与或结果状态"
          />
          <FilterBar>
            <input placeholder="姓名 / 工号" />
            <select>
              <option>全部参与状态</option>
            </select>
            <select>
              <option>全部结果状态</option>
            </select>
          </FilterBar>
        </div>
        <DataTable
          compact
          headers={[
            "姓名",
            "工号",
            "部门快照",
            "参与状态",
            "结果状态",
            "官方得分",
            "是否通过",
            "有效 / 总尝试",
            "官方用时",
            "关注",
            "操作",
          ]}
          rows={[
            [
              "张伟",
              "E1024",
              "总部 / 技术中心 / 研发部",
              <Status tone="info">考试中</Status>,
              <Status tone="danger">未通过</Status>,
              "72",
              "未通过",
              "1 / 2",
              "51:32",
              "—",
              <button
                className="table-action"
                onClick={() => navigateTo("AD-15", "in-progress")}
              >
                尝试详情
              </button>,
            ],
            [
              "陈晓雨",
              "A02418",
              "总部 / 产品中心 / 产品设计部",
              <Status tone="success">已交卷</Status>,
              scenario === "recalculated" ? (
                <Status tone="danger">未通过</Status>
              ) : (
                <Status tone="success">已通过</Status>
              ),
              scenario === "recalculated" ? "72" : "96",
              scenario === "recalculated" ? "未通过" : "通过",
              scenario === "recalculated" ? "1 / 2" : "2 / 2",
              scenario === "recalculated" ? "51:40" : "42:18",
              <Status tone="danger">关注</Status>,
              <button
                className="table-action"
                onClick={() =>
                  navigateTo(
                    "AD-15",
                    scenario === "recalculated" ? "voided" : "standard",
                  )
                }
              >
                尝试详情
              </button>,
            ],
            [
              "赵凯",
              "E1098",
              "总部 / 技术中心 / 研发部",
              <Status>未参加</Status>,
              <Status>待定</Status>,
              "—",
              "—",
              "0 / 0",
              "—",
              "—",
              <button className="table-action">详情</button>,
            ],
          ]}
        />
      </section>
      <section className="admin-panel admin-export">
        <SectionHeader
          title="导出任务"
          description="固定包含“官方成绩汇总”和“全部尝试明细”两个工作表"
          action={
            <Button
              disabled={locked || exportRun === "queued"}
              onClick={() => openModal("export")}
            >
              <FileSpreadsheet size={15} />
              {exportRun === "queued" ? "生成中" : "生成导出"}
            </Button>
          }
        />
        {exportRun === "idle" && scenario === "export-failed" ? (
          <Banner
            title="生成失败 · 今天 10:31"
            tone="danger"
            action={
              <Button variant="secondary" onClick={() => openModal("export")}>
                重新生成
              </Button>
            }
          >
            未提供不完整文件。
          </Banner>
        ) : exportRun === "idle" && scenario === "export-expired" ? (
          <Banner
            title="文件已过期"
            tone="warning"
            action={
              <Button variant="secondary" onClick={() => openModal("export")}>
                重新生成
              </Button>
            }
          >
            完成已超过 24 小时，任务摘要保留。
          </Banner>
        ) : exportRun === "queued" ? (
          <div className="export-job">
            <FileClock size={18} />
            <span>
              <b>排队中</b>
              <small>任务 EXP-20260811-12 · 周敏</small>
            </span>
            <ProgressBar value={18} />
          </div>
        ) : exportRun === "done" || exportRun === "downloaded" ? (
          <div className="export-job">
            <CheckCircle2 size={18} />
            <span>
              <b>已完成</b>
              <small>
                {exportRun === "downloaded"
                  ? "下载已开始 · 文件名：信息安全考试成绩.xlsx"
                  : "10:48 完成 · 失效于明日 10:48"}
              </small>
            </span>
            <Button
              variant="secondary"
              disabled={exportRun === "downloaded"}
              onClick={onDownload}
            >
              <Download size={15} />
              {exportRun === "downloaded" ? "已下载" : "下载"}
            </Button>
          </div>
        ) : (
          <EmptyState
            title="暂无导出任务"
            description="生成任务将按当前最新官方结果创建双工作表文件。"
          />
        )}
      </section>
    </>
  );
}

function AttemptPage({
  scenario,
  navigateTo,
  openModal,
}: {
  scenario: string;
  navigateTo: SurfacePrototypeProps["navigateTo"];
  openModal: (kind: ModalKind) => void;
}) {
  const inProgress = scenario === "in-progress";
  const processing = scenario === "processing";
  const voided = scenario === "voided";
  const voidedActive = scenario === "voided-active";
  const terminated = scenario === "terminated";
  const unsettled = inProgress || processing;
  const unscored = unsettled || voidedActive;
  const blocked =
    processing ||
    ["voided", "voided-active", "terminated", "voiding"].includes(scenario);
  const attempt2State =
    voided || voidedActive
      ? "已作废"
      : terminated
        ? "无官方效力"
        : processing
          ? "交卷处理中"
          : inProgress
            ? "进行中"
            : "官方尝试";
  const attempt2Tone: Tone =
    voided || voidedActive || terminated
      ? "danger"
      : processing || inProgress
        ? "warning"
        : "success";
  const attempt2Meta = inProgress
    ? "08-11 10:02 · 已答 28 / 50 · 得分待定"
    : processing
      ? "08-11 10:02 · 已答 50 / 50 · 得分待定"
      : voidedActive
        ? "08-11 10:02 · 已答 28 / 50 · 未生成得分"
        : `08-11 10:02 · 42:18 · ${voided ? "原得分" : "得分"} 96`;
  const attempt1IsOfficial = voided || voidedActive || unsettled;
  const activeEmployee = unsettled || voidedActive;
  return (
    <>
      <PageTop
        eyebrow={`成绩统计 / ${activeEmployee ? "张伟 E1024" : "陈晓雨 A02418"}`}
        title="尝试详情"
        description="2026 年信息安全考试 · 总分 100 · 及格 80"
        status={
          <>
            {terminated ? (
              <Status tone="danger">当前无官方结果</Status>
            ) : (
              <Status tone={scenario === "standard" ? "success" : "warning"}>
                {scenario === "standard"
                  ? "官方结果 96 · 尝试 #2"
                  : "官方结果 72 · 未通过 · 尝试 #1"}
              </Status>
            )}
            <Status
              tone={
                scenario === "voided" ||
                voidedActive ||
                scenario === "terminated"
                  ? "danger"
                  : "neutral"
              }
            >
              {scenario === "voided" || voidedActive
                ? "已作废"
                : scenario === "terminated"
                  ? "无官方效力"
                  : scenario === "processing"
                    ? "交卷处理中"
                    : scenario === "in-progress"
                      ? "进行中"
                      : "已完成"}
            </Status>
            {(scenario === "voided" || voidedActive) && (
              <Status>有效 / 总尝试 1 / 2</Status>
            )}
          </>
        }
        actions={
          <Button
            variant="ghost"
            onClick={() =>
              navigateTo(
                "AD-14",
                voided || voidedActive
                  ? "recalculated"
                  : terminated
                    ? "canceled"
                    : "standard",
              )
            }
          >
            <ChevronLeft size={15} />
            返回成绩
          </Button>
        }
      />
      {scenario === "processing" && (
        <Banner title="交卷处理中" tone="warning">
          作废暂不可用，请等待唯一交卷与评分结果收敛。
        </Banner>
      )}
      {inProgress && (
        <Banner title="尝试 #2 正在进行" tone="info">
          仅展示已确认保存的答案事实；本次尝试尚无得分、正误或标准答案。
        </Banner>
      )}
      {scenario === "voided" && (
        <Banner title="尝试 #2 已作废" tone="danger">
          原试卷、答案和得分保留；已返还一次次数，尝试 #1 的 72
          分成为新官方结果。
        </Banner>
      )}
      {voidedActive && (
        <Banner title="进行中尝试 #2 已作废" tone="danger">
          已确认答案和时间线继续保留，本次未生成得分；已返还一次参加次数。
        </Banner>
      )}
      <div className="admin-attempt-layout">
        <aside className="admin-panel admin-attempt-list">
          <SectionHeader title="全部尝试" description="按开始时间排列" />
          <button>
            <span>
              <b>尝试 #2</b>
              <Status tone={attempt2Tone}>{attempt2State}</Status>
            </span>
            <small>{attempt2Meta}</small>
            <em>{unscored ? "当前尝试未形成结果" : "异常关注：评分重试"}</em>
          </button>
          <button>
            <span>
              <b>尝试 #1</b>
              <Status
                tone={
                  terminated
                    ? "danger"
                    : attempt1IsOfficial
                      ? "success"
                      : "neutral"
                }
              >
                {terminated
                  ? "无官方效力"
                  : attempt1IsOfficial
                    ? "官方尝试"
                    : "有效"}
              </Status>
            </span>
            <small>08-11 09:04 · 51:40 · 72 分</small>
            <em>主动提交</em>
          </button>
        </aside>
        <section className="admin-panel admin-paper">
          <div className="admin-paper-top">
            <SectionHeader
              title="固定试卷"
              description={
                unscored
                  ? "题目、顺序、版本与已确认答案只读；评分尚未生成"
                  : "题目、顺序、版本、答案、分值和得分全部只读"
              }
            />
            <div className="admin-paper-filter">
              <button className="is-active">全部 50</button>
              {unscored ? (
                <>
                  <button>已答 {processing ? 50 : 28}</button>
                  <button>未答 {processing ? 0 : 22}</button>
                </>
              ) : (
                <>
                  <button>正确 48</button>
                  <button>错误 2</button>
                  <button>未答 0</button>
                </>
              )}
            </div>
          </div>
          <article className="admin-question-review">
            <div>
              <span>第 12 题 · 单选</span>
              <Badge>题目版本 Q-0241 / V5</Badge>
              <b>
                {unscored ? (voidedActive ? "未评分" : "得分待定") : "2 / 2 分"}
              </b>
            </div>
            <h3>以下哪项是识别钓鱼邮件的有效方法？</h3>
            <ol>
              <li className={unscored ? "" : "is-correct"}>
                <span>A</span>检查发件地址与链接域名{" "}
                <Status tone={unscored ? "info" : "success"}>
                  {unscored ? "已确认答案" : "员工答案 / 标准答案"}
                </Status>
              </li>
              <li>
                <span>B</span>只要有公司 Logo 就可信
              </li>
              <li>
                <span>C</span>立即下载所有附件
              </li>
              <li>
                <span>D</span>直接回复提供账号密码
              </li>
            </ol>
          </article>
          <article className="admin-question-review">
            <div>
              <span>第 23 题 · 多选</span>
              <Badge>题目版本 Q-0310 / V3</Badge>
              <b>
                {unscored ? (voidedActive ? "未评分" : "得分待定") : "0 / 3 分"}
              </b>
            </div>
            <h3>敏感数据对外发送前必须完成哪些步骤？</h3>
            <p className="answer-summary">
              {unscored
                ? `已确认答案 A · ${voidedActive ? "本次未评分" : "评分与标准答案尚未生成"}`
                : "员工答案 A · 标准答案 A、C · 严格评分不得分"}
            </p>
          </article>
        </section>
      </div>
      <section className="admin-panel admin-timeline">
        <SectionHeader
          title="事实时间线"
          description="自动保存仅展示确认摘要，不显示答案原文"
        />
        <div className="timeline-row">
          <span>10:02:11</span>
          <CircleDot size={12} />
          <p>
            <b>创建尝试 #2</b>固定试卷 50 题，到期时间 11:02:11
          </p>
        </div>
        <div className="timeline-row">
          <span>10:23:18</span>
          <ShieldAlert size={13} />
          <p>
            <b>平台暂停</b>命中故障事件 OUT-20260811-02
          </p>
        </div>
        <div className="timeline-row">
          <span>10:42:00</span>
          <Clock3 size={13} />
          <p>
            <b>补时确认</b>到期时间顺延 18 分 42 秒
          </p>
        </div>
        {inProgress ? (
          <div className="timeline-row">
            <span>10:46:12</span>
            <Check size={13} />
            <p>
              <b>第 28 题保存确认</b>答案版本 37，尝试仍在进行
            </p>
          </div>
        ) : processing ? (
          <div className="timeline-row">
            <span>11:03:11</span>
            <Clock3 size={13} />
            <p>
              <b>取得唯一交卷终结权</b>评分处理中，尚未形成得分
            </p>
          </div>
        ) : voidedActive ? (
          <div className="timeline-row">
            <span>10:47:08</span>
            <Trash2 size={13} />
            <p>
              <b>管理员作废进行中尝试</b>已确认答案保留，未生成评分结果
            </p>
          </div>
        ) : terminated ? (
          <div className="timeline-row">
            <span>11:06:40</span>
            <AlertOctagon size={13} />
            <p>
              <b>整场取消并终止尝试</b>历史评分事实保留但无官方效力
            </p>
          </div>
        ) : (
          <div className="timeline-row">
            <span>11:03:11</span>
            <Check size={13} />
            <p>
              <b>主动交卷并评分</b>总分 96，结果唯一
            </p>
          </div>
        )}
      </section>
      <div className="admin-danger-zone">
        <div>
          <strong>作废个人尝试</strong>
          <span>
            原始事实保留，返还一次并立即重算最高有效分；不会个人加时。
          </span>
        </div>
        <Button
          variant="danger"
          disabled={blocked}
          onClick={() => openModal("void-attempt")}
        >
          <Trash2 size={15} />
          作废尝试 #2
        </Button>
      </div>
    </>
  );
}

function AuditPage({ scenario }: { scenario: string }) {
  return (
    <>
      <PageTop
        title="审计日志"
        description="应用内永久只读 · 安全与审计数据至少保留 5 年"
        actions={
          <Button variant="secondary">
            <FileDown size={15} />
            导出当前结果
          </Button>
        }
      />
      {scenario === "integrity" && (
        <Banner title="日志完整性验证失败" tone="danger">
          追踪标识 req-8fb2…a11 对应记录校验异常，后台不能修改或补写原记录。
        </Banner>
      )}
      {scenario === "incomplete" && (
        <Banner title="故障事件链不完整" tone="danger">
          OUT-20260811-02 缺失证据版本 E3，或存在非法状态跳转。
        </Banner>
      )}
      {scenario === "revoked" && (
        <Banner title="导出下载已拒绝" tone="danger">
          当前管理员资格或对象范围已撤销，本次拒绝已生成新审计记录。
        </Banner>
      )}
      <FilterBar>
        <input type="date" />
        <input placeholder="操作人" />
        <select>
          <option>全部操作类型</option>
        </select>
        <input placeholder="对象类型 / 标识" />
        <select>
          <option>全部结果</option>
        </select>
        <input placeholder="请求追踪标识" />
      </FilterBar>
      {scenario === "empty" ? (
        <EmptyState
          title="无匹配记录"
          description="当前筛选条件没有审计事件，筛选条件已保留。"
        />
      ) : (
        <div className="admin-audit-layout">
          <section className="admin-panel">
            <DataTable
              compact
              headers={[
                "时间",
                "操作人 / 角色",
                "操作",
                "对象",
                "结果",
                "来源",
                "追踪标识",
              ]}
              rows={[
                [
                  cell("今天 10:45:31", "Pacific/Auckland"),
                  cell("周敏", "异常处置授权管理员"),
                  "确认故障补时",
                  "OUT-20260811-02 / V3",
                  <Status tone="success">成功</Status>,
                  "后台 / 10.2.*.*",
                  <button className="table-action">req-8fb2…a11</button>,
                ],
                [
                  cell("今天 10:43:02", "Pacific/Auckland"),
                  cell("李娜", "企业管理员"),
                  "查看故障状态",
                  "OUT-20260811-02",
                  <Status tone="success">成功</Status>,
                  "后台 / 10.2.*.*",
                  <button className="table-action">req-742a…c90</button>,
                ],
                [
                  cell("今天 10:31:18", "Pacific/Auckland"),
                  cell("系统", "监控"),
                  "生成提案版本",
                  "OUT-20260811-02 / V3",
                  <Status tone="success">成功</Status>,
                  "核心服务",
                  <button className="table-action">evt-203c…921</button>,
                ],
                [
                  cell("今天 09:58:46", "Pacific/Auckland"),
                  cell("周敏", "企业管理员"),
                  "下载成绩文件",
                  "EXP-20260811-09",
                  <Status tone="danger">权限拒绝</Status>,
                  "后台 / 10.2.*.*",
                  <button className="table-action">req-f18c…e01</button>,
                ],
              ]}
            />
          </section>
          <aside className="admin-panel admin-audit-detail">
            <SectionHeader
              title="审计详情"
              description="只读 · 敏感字段已脱敏"
            />
            <dl className="admin-detail-list">
              <div>
                <dt>操作</dt>
                <dd>确认故障补时</dd>
              </div>
              <div>
                <dt>对象</dt>
                <dd>OUT-20260811-02 / 提案 V3</dd>
              </div>
              <div>
                <dt>前后摘要</dt>
                <dd>暂停中 → 正常；停止新开卷 +18:42</dd>
              </div>
              <div>
                <dt>复核意见</dt>
                <dd>已核对健康检查与影响范围</dd>
              </div>
              <div>
                <dt>完整追踪标识</dt>
                <dd>req-8fb2-91ce-44a0-a11</dd>
              </div>
            </dl>
            <div className="admin-integrity">
              <ShieldCheck size={18} />
              <span>
                <b>完整性可验证</b>
                <small>最后验证：今天 10:46</small>
              </span>
            </div>
            <SectionHeader
              title="故障事件链"
              description="证据与提案版本串联"
            />
            <ol className="event-chain">
              <li>
                <Status tone="danger">已触发</Status>
                <span>证据 E1 · 10:23:18</span>
              </li>
              <li>
                <Status tone="warning">待确认</Status>
                <span>提案 V2 · 10:28:04</span>
              </li>
              <li>
                <Status tone="info">系统复核中</Status>
                <span>V2 驳回 · 10:29:12</span>
              </li>
              <li>
                <Status tone="warning">待确认</Status>
                <span>提案 V3 · 10:31:18</span>
              </li>
              <li>
                <Status tone="success">已确认</Status>
                <span>补时完成 · 10:45:31</span>
              </li>
            </ol>
          </aside>
        </div>
      )}
    </>
  );
}

type DecisionReasons = { internal: string; employee: string };

function ModalContent({
  kind,
  reasons,
  onReasonChange,
}: {
  kind: Exclude<ModalKind, null>;
  reasons: DecisionReasons;
  onReasonChange: (field: keyof DecisionReasons, value: string) => void;
}) {
  if (kind === "create")
    return (
      <div className="admin-form-stack">
        <Field label="名称 / 姓名" value="" />
        <Field label="工号或说明" value="" />
        <Field
          label="主部门完整路径"
          value="总部 / 技术中心 / 研发部"
          type="select"
        />
      </div>
    );
  if (kind === "import")
    return (
      <>
        <Banner title="部分导入规则" tone="info">
          合法行将一次写入；错误、重复和冲突行跳过并进入错误结果。
        </Banner>
        <label className="admin-confirm-check">
          <input type="checkbox" />
          我已确认全部待建层级和可导入数量
        </label>
      </>
    );
  if (kind === "disable")
    return (
      <>
        <p>停用仅影响未来业务，历史版本和已发布考试快照保持不变。</p>
        <label className="admin-confirm-check">
          <input type="checkbox" />
          我已核对影响摘要
        </label>
      </>
    );
  if (kind === "publish")
    return (
      <>
        <p>
          发布后名称、时间、规则、人员、候选版本、分值和展示策略不可原地修改。
        </p>
        <label className="admin-confirm-check">
          <input type="checkbox" />
          我确认冻结当前发布版本
        </label>
      </>
    );
  if (kind === "confirm-outage")
    return (
      <>
        <Field
          label="复核意见"
          value="已核对技术恢复、影响区间和补偿范围"
          type="textarea"
        />
        <div className="modal-facts">
          <span>合并区间</span>
          <b>10:23:18-10:42:00</b>
          <span>统一补时</span>
          <b>18 分 42 秒</b>
        </div>
      </>
    );
  if (kind === "reject-outage")
    return (
      <>
        <Field
          label="内部复核说明"
          value="影响范围仍需重新核验"
          type="textarea"
        />
        <Banner title="驳回后继续暂停" tone="warning">
          系统将复核并生成新的不可编辑提案，实际暂停时间仍必须补偿。
        </Banner>
      </>
    );
  if (kind === "cancel-exam" || kind === "void-attempt")
    return (
      <>
        <label className="admin-field">
          <span>内部处置原因 *</span>
          <textarea
            aria-label="内部处置原因"
            required
            value={reasons.internal}
            onChange={(event) => onReasonChange("internal", event.target.value)}
          />
        </label>
        <label className="admin-field">
          <span>员工可见说明 *</span>
          <textarea
            aria-label="员工可见说明"
            required
            value={reasons.employee}
            onChange={(event) => onReasonChange("employee", event.target.value)}
          />
        </label>
        {(!reasons.internal.trim() || !reasons.employee.trim()) && (
          <p className="field-error" role="status">
            两项说明均为必填，填写完整后才能确认。
          </p>
        )}
        <Banner
          title={kind === "cancel-exam" ? "取消不可恢复" : "原始事实不会删除"}
          tone="danger"
        >
          {kind === "cancel-exam"
            ? "在途尝试终止，已完成结果失去官方效力。"
            : "该尝试退出官方成绩、返还一次并立即重算。"}
        </Banner>
      </>
    );
  if (kind === "export")
    return (
      <>
        <p>
          将生成一个文件，固定包含“官方成绩汇总”和“全部尝试明细”两个工作表。
        </p>
        <div className="modal-facts">
          <span>应考员工</span>
          <b>132 人</b>
          <span>全部尝试</span>
          <b>184 条</b>
          <span>文件有效期</span>
          <b>完成后 24 小时</b>
        </div>
      </>
    );
  return (
    <>
      <Banner title="一次性敏感结果" tone="warning">
        结果层关闭后不可再次查看，临时密码不得进入日志或普通列表。
      </Banner>
      <div className="secret-value">N7v!4mQ2sK</div>
    </>
  );
}

const modalTitles: Record<Exclude<ModalKind, null>, string> = {
  create: "新建记录",
  import: "确认导入",
  disable: "确认停用",
  publish: "冻结并发布",
  "confirm-outage": "确认故障补时",
  "reject-outage": "驳回并进入系统复核",
  "cancel-exam": "取消整场考试",
  "void-attempt": "作废个人尝试",
  export: "生成成绩导出",
  secret: "一次性临时密码",
};

export function AdminPrototype({
  page,
  scenario,
  navigateTo,
  setScenario,
}: SurfacePrototypeProps) {
  const [modal, setModal] = useState<ModalKind>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [exportRun, setExportRun] = useState<ExportRun>("idle");
  const [decisionReasons, setDecisionReasons] = useState<DecisionReasons>({
    internal: "",
    employee: "",
  });
  if (page.id === "AD-01")
    return <LoginPage scenario={scenario} navigateTo={navigateTo} />;
  const openModal = (kind: ModalKind) => {
    if (kind === "cancel-exam" || kind === "void-attempt") {
      setDecisionReasons({ internal: "", employee: "" });
    }
    setModal(kind);
  };
  const confirmModal = () => {
    if (
      (modal === "cancel-exam" || modal === "void-attempt") &&
      (!decisionReasons.internal.trim() || !decisionReasons.employee.trim())
    ) {
      return;
    }
    if (modal === "create" && page.id === "AD-03") {
      setModal("secret");
      return;
    }
    if (modal === "publish") navigateTo("AD-13");
    if (modal === "confirm-outage") setScenario("confirmed");
    if (modal === "reject-outage") setScenario("review");
    if (modal === "cancel-exam") setScenario("canceled");
    if (modal === "void-attempt") {
      setScenario(scenario === "in-progress" ? "voided-active" : "voided");
    }
    if (modal === "export") {
      setExportRun("queued");
      window.setTimeout(() => setExportRun("done"), 1100);
    }
    if (modal === "import" && page.id === "AD-03") {
      setScenario(scenario === "partial" ? "credential" : "partial");
    }
    if (modal === "import" && page.id === "AD-09") {
      navigateTo("AD-08", "success");
    }
    setModal(null);
  };
  let content: ReactNode;
  switch (page.id) {
    case "AD-02":
      content = <DepartmentPage scenario={scenario} openModal={openModal} />;
      break;
    case "AD-03":
      content = (
        <EmployeePage
          scenario={scenario}
          openModal={openModal}
          navigateTo={navigateTo}
        />
      );
      break;
    case "AD-04":
      content = <AccountPage scenario={scenario} openModal={openModal} />;
      break;
    case "AD-05":
      content = (
        <BankPage
          scenario={scenario}
          openModal={openModal}
          navigateTo={navigateTo}
        />
      );
      break;
    case "AD-06":
      content = <QuestionsPage scenario={scenario} navigateTo={navigateTo} />;
      break;
    case "AD-07":
      content = (
        <QuestionEditor
          scenario={scenario}
          navigateTo={navigateTo}
          openModal={openModal}
        />
      );
      break;
    case "AD-08":
      content = <ImportTasks scenario={scenario} navigateTo={navigateTo} />;
      break;
    case "AD-09":
      content = (
        <ImportPreview
          scenario={scenario}
          navigateTo={navigateTo}
          openModal={openModal}
        />
      );
      break;
    case "AD-10":
      content = <ExamsPage scenario={scenario} navigateTo={navigateTo} />;
      break;
    case "AD-11":
      content = (
        <WizardPage
          scenario={scenario}
          step={wizardStep}
          setStep={setWizardStep}
          navigateTo={navigateTo}
        />
      );
      break;
    case "AD-12":
      content = (
        <PrecheckPage
          scenario={scenario}
          navigateTo={navigateTo}
          openModal={openModal}
        />
      );
      break;
    case "AD-13":
      content = (
        <MonitorPage
          scenario={scenario}
          navigateTo={navigateTo}
          openModal={openModal}
        />
      );
      break;
    case "AD-14":
      content = (
        <ResultsPage
          scenario={scenario}
          navigateTo={navigateTo}
          openModal={openModal}
          exportRun={exportRun}
          onDownload={() => setExportRun("downloaded")}
        />
      );
      break;
    case "AD-15":
      content = (
        <AttemptPage
          scenario={scenario}
          navigateTo={navigateTo}
          openModal={openModal}
        />
      );
      break;
    case "AD-16":
      content = <AuditPage scenario={scenario} />;
      break;
    default:
      content = (
        <EmptyState title="页面不可用" description="当前页面不属于管理后台。" />
      );
  }
  return (
    <AdminShell page={page} navigateTo={navigateTo}>
      <ScenarioNotice page={page} scenario={scenario} />
      {content}
      {modal && (
        <Modal
          title={modalTitles[modal]}
          confirmLabel={modal === "secret" ? "关闭结果层" : "确认"}
          danger={[
            "disable",
            "reject-outage",
            "cancel-exam",
            "void-attempt",
          ].includes(modal)}
          onCancel={() => setModal(null)}
          onConfirm={confirmModal}
          confirmDisabled={
            (modal === "cancel-exam" || modal === "void-attempt") &&
            (!decisionReasons.internal.trim() ||
              !decisionReasons.employee.trim())
          }
        >
          <ModalContent
            kind={modal}
            reasons={decisionReasons}
            onReasonChange={(field, value) =>
              setDecisionReasons((current) => ({ ...current, [field]: value }))
            }
          />
        </Modal>
      )}
    </AdminShell>
  );
}
