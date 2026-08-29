import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Eye,
  EyeOff,
  FileCheck2,
  KeyRound,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MailCheck,
  MonitorCheck,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TimerReset,
  TriangleAlert,
  UserRound,
  XCircle,
} from "lucide-react";
import type { PrototypePage, SurfacePrototypeProps, Tone } from "../types";
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
  Segmented,
} from "../components/ui";
import "./ExamPrototype.css";

export const examPages: PrototypePage[] = [
  {
    id: "EX-01",
    surface: "exam",
    title: "登录 / 首登改密 / 找回密码",
    description: "统一账号认证、强制改密与安全找回",
    scenarios: [
      { id: "standard", label: "账号登录", description: "企业工号与密码登录" },
      {
        id: "first-login",
        label: "首登强制改密",
        description: "认证后仅能先设置新密码",
        tone: "warning",
      },
      {
        id: "recovery",
        label: "短信找回",
        description: "账号与档案手机号验证",
        tone: "info",
      },
      {
        id: "locked",
        label: "账号锁定",
        description: "连续失败后显示通用锁定提示",
        tone: "danger",
      },
      {
        id: "session-expired",
        label: "考试中会话失效",
        description: "重新登录后恢复原尝试",
        tone: "warning",
      },
      {
        id: "unsupported",
        label: "浏览器不支持",
        description: "阻断新考试业务",
        tone: "danger",
      },
    ],
    fr: [
      "FR-AUTH-01",
      "FR-AUTH-02",
      "FR-AUTH-03",
      "FR-AUTH-06",
      "FR-OPS-03",
      "FR-OPS-04",
    ],
    flows: ["FL-AUTH"],
    acceptance: [
      "EX-01-AC-01",
      "EX-01-AC-02",
      "EX-01-AC-03",
      "EX-01-AC-04",
      "EX-01-AC-05",
      "EX-01-AC-06",
    ],
  },
  {
    id: "EX-02",
    surface: "exam",
    title: "任务列表与考试码定位",
    description: "查看本人正式考试任务与当前可执行动作",
    scenarios: [
      {
        id: "standard",
        label: "多状态任务",
        description: "未开始、可开卷与已提交任务",
      },
      {
        id: "paused",
        label: "考试暂停",
        description: "禁止新开卷，在途尝试可只读恢复",
        tone: "warning",
      },
      {
        id: "closing",
        label: "收尾观察",
        description: "停止新开卷后等待整场结束确认",
        tone: "info",
      },
      {
        id: "no-retry",
        label: "无后续参加机会",
        description: "不泄露未公开通过结论",
        tone: "neutral",
      },
      {
        id: "canceled",
        label: "考试已取消",
        description: "仅显示员工可见取消说明",
        tone: "danger",
      },
      { id: "empty", label: "无考试任务", description: "保留考试码定位入口" },
      {
        id: "load-error",
        label: "列表加载失败",
        description: "不保留上一账号数据",
        tone: "danger",
      },
    ],
    fr: [
      "FR-AUTH-06",
      "FR-EXM-04",
      "FR-EXM-05",
      "FR-ATT-01",
      "FR-ATT-03",
      "FR-SCR-04",
      "FR-OPS-01",
      "FR-OPS-02",
    ],
    flows: ["FL-ATT"],
    acceptance: [
      "EX-02-AC-01",
      "EX-02-AC-02",
      "EX-02-AC-03",
      "EX-02-AC-04",
      "EX-02-AC-05",
      "EX-02-AC-06",
      "EX-02-AC-07",
      "EX-02-AC-08",
      "EX-02-AC-09",
    ],
  },
  {
    id: "EX-03",
    surface: "exam",
    title: "考前说明与资格状态",
    description: "展示考试规则、服务端资格与唯一主操作",
    scenarios: [
      {
        id: "standard",
        label: "可开始考试",
        description: "开卷前进行二次确认",
      },
      {
        id: "resume",
        label: "恢复原尝试",
        description: "在途尝试优先于新开卷",
        tone: "info",
      },
      {
        id: "processing",
        label: "开卷处理中",
        description: "并发请求收敛到同一尝试",
        tone: "info",
      },
      {
        id: "retry",
        label: "可创建第 2 次尝试",
        description: "已有 1 次完成历史，最大次数为 2",
        tone: "info",
      },
      {
        id: "retry-after-void",
        label: "作废返次后可重考",
        description: "第 2 次尝试保留为作废历史，新建第 3 次尝试",
        tone: "warning",
      },
      {
        id: "paused",
        label: "暂停且无在途",
        description: "暂停期间禁止新开卷",
        tone: "warning",
      },
      {
        id: "paused-active",
        label: "暂停且有在途",
        description: "可进入答题页只读查看",
        tone: "warning",
      },
      {
        id: "closing",
        label: "收尾观察",
        description: "无在途也必须等待 20 秒",
        tone: "info",
      },
      {
        id: "no-retry",
        label: "无后续参加机会",
        description: "内部通过结论未公开",
        tone: "neutral",
      },
      {
        id: "canceled",
        label: "考试已取消",
        description: "移除开始与继续操作",
        tone: "danger",
      },
      {
        id: "unsupported",
        label: "兼容性阻断",
        description: "新尝试不允许开始",
        tone: "danger",
      },
    ],
    fr: [
      "FR-AUTH-06",
      "FR-EXM-03",
      "FR-EXM-04",
      "FR-EXM-05",
      "FR-ATT-01",
      "FR-ATT-02",
      "FR-ATT-03",
      "FR-ANS-02",
      "FR-SCR-02",
      "FR-SCR-04",
      "FR-OPS-01",
      "FR-OPS-02",
      "FR-OPS-04",
    ],
    flows: ["FL-ATT"],
    acceptance: [
      "EX-03-AC-01",
      "EX-03-AC-02",
      "EX-03-AC-03",
      "EX-03-AC-04",
      "EX-03-AC-05",
      "EX-03-AC-06",
      "EX-03-AC-07",
      "EX-03-AC-08",
      "EX-03-AC-09",
    ],
  },
  {
    id: "EX-04",
    surface: "exam",
    title: "答题工作台",
    description: "固定试卷、版本化逐题保存、服务端计时与幂等交卷",
    scenarios: [
      {
        id: "standard",
        label: "正常作答",
        description: "服务端确认答案与剩余时间",
      },
      {
        id: "saving",
        label: "答案保存中",
        description: "切题不中断原题保存",
        tone: "info",
      },
      {
        id: "save-failed",
        label: "答案保存失败",
        description: "保留失败标记并阻止交卷",
        tone: "danger",
      },
      {
        id: "conflict",
        label: "保存版本冲突",
        description: "加载服务端最新答案后重新确认",
        tone: "warning",
      },
      {
        id: "offline",
        label: "员工断网",
        description: "计时继续，未确认选择不冒充已保存",
        tone: "danger",
      },
      {
        id: "paused",
        label: "平台暂停",
        description: "试卷可见但全部只读",
        tone: "warning",
      },
      {
        id: "expiry-observe",
        label: "到期 20 秒观察",
        description: "不立即标记已提交",
        tone: "info",
      },
      {
        id: "submitting",
        label: "交卷处理中",
        description: "全卷锁定并收敛到唯一结果",
        tone: "info",
      },
      {
        id: "second-attempt",
        label: "第 2 次作答",
        description: "重新抽卷后在本次尝试内永久固定",
        tone: "info",
      },
      {
        id: "third-attempt",
        label: "作废返次后的第 3 次作答",
        description: "历史序号递增，但只占第 2 个有效名额",
        tone: "warning",
      },
      {
        id: "invalidated",
        label: "在途尝试被作废",
        description: "显示员工可见作废说明",
        tone: "danger",
      },
      {
        id: "canceled",
        label: "作答中考试取消",
        description: "立即只读并退出答题",
        tone: "danger",
      },
    ],
    fr: [
      "FR-AUTH-06",
      "FR-ATT-02",
      "FR-ANS-01",
      "FR-ANS-02",
      "FR-ANS-03",
      "FR-ANS-04",
      "FR-OPS-01",
      "FR-OPS-02",
      "FR-OPS-03",
      "FR-OPS-04",
    ],
    flows: ["FL-SAVE", "FL-SUB"],
    acceptance: [
      "EX-04-AC-01",
      "EX-04-AC-02",
      "EX-04-AC-03",
      "EX-04-AC-04",
      "EX-04-AC-05",
      "EX-04-AC-06",
      "EX-04-AC-07",
      "EX-04-AC-08",
      "EX-04-AC-09",
      "EX-04-AC-10",
      "EX-04-AC-11",
    ],
  },
  {
    id: "EX-05",
    surface: "exam",
    title: "结果与复盘",
    description: "按公开策略展示官方结果、尝试记录与逐题复盘",
    scenarios: [
      {
        id: "standard",
        label: "汇总与复盘已公开",
        description: "展示获准汇总与固定版本复盘",
        tone: "success",
      },
      {
        id: "summary-only",
        label: "仅汇总公开",
        description: "不渲染任何逐题内容",
        tone: "info",
      },
      {
        id: "pass-hidden",
        label: "通过结论未公开",
        description: "只显示获准得分与中性操作结论",
      },
      {
        id: "retry",
        label: "可再次考试",
        description: "服务端内部判定仍有合法机会",
        tone: "info",
      },
      {
        id: "pending",
        label: "汇总待公布",
        description: "只展示已提交事实",
        tone: "neutral",
      },
      {
        id: "closing",
        label: "整场结束观察",
        description: "不返回最终结果或逐题内容",
        tone: "info",
      },
      {
        id: "paused",
        label: "考试暂停中",
        description: "仅显示提交事实与等待恢复",
        tone: "warning",
      },
      {
        id: "locked",
        label: "结果锁定",
        description: "严重一致性异常后锁定披露",
        tone: "danger",
      },
      {
        id: "voided",
        label: "尝试作废与重算",
        description: "保留原行并重新计算官方成绩",
        tone: "warning",
      },
      {
        id: "canceled",
        label: "考试已取消",
        description: "关闭成绩效力与逐题复盘",
        tone: "danger",
      },
    ],
    fr: [
      "FR-AUTH-06",
      "FR-EXM-04",
      "FR-EXM-05",
      "FR-ATT-03",
      "FR-SCR-01",
      "FR-SCR-02",
      "FR-SCR-03",
      "FR-SCR-04",
      "FR-OPS-03",
    ],
    flows: ["FL-VIS"],
    acceptance: [
      "EX-05-AC-01",
      "EX-05-AC-02",
      "EX-05-AC-03",
      "EX-05-AC-04",
      "EX-05-AC-05",
      "EX-05-AC-06",
      "EX-05-AC-07",
      "EX-05-AC-08",
      "EX-05-AC-09",
      "EX-05-AC-10",
      "EX-05-AC-11",
      "EX-05-AC-12",
    ],
  },
];

type PageProps = Pick<
  SurfacePrototypeProps,
  "scenario" | "navigateTo" | "setScenario"
>;

const taskFilterOptions = [
  { value: "all", label: "全部" },
  { value: "upcoming", label: "待开始" },
  { value: "active", label: "进行中" },
  { value: "retry", label: "可重考" },
  { value: "finished", label: "已完成" },
] as const;

type TaskFilter = (typeof taskFilterOptions)[number]["value"];

function toneForStatus(status: string): Tone {
  if (
    status.includes("取消") ||
    status.includes("失败") ||
    status.includes("作废")
  )
    return "danger";
  if (status.includes("暂停") || status.includes("收尾")) return "warning";
  if (
    status.includes("开放") ||
    status.includes("进行") ||
    status.includes("处理")
  )
    return "info";
  if (status.includes("完成") || status.includes("已交")) return "success";
  return "neutral";
}

function ExamBrand({
  loggedIn = true,
  onTasks,
  onLogout,
}: {
  loggedIn?: boolean;
  onTasks?: () => void;
  onLogout?: () => void;
}) {
  return (
    <header className="exam-brandbar">
      <button
        className="exam-brandbar__brand"
        type="button"
        onClick={onTasks}
        disabled={!onTasks}
      >
        <span className="exam-brandbar__mark">
          <ShieldCheck size={20} />
        </span>
        <span>
          <strong>企业正式考试</strong>
          <small>安全、可恢复的员工考核入口</small>
        </span>
      </button>
      {loggedIn ? (
        <div className="exam-brandbar__identity">
          <span>
            <UserRound size={16} />
            <span>
              <strong>陈晓雨</strong>
              <small>A02418</small>
            </span>
          </span>
          {onLogout && (
            <IconButton label="退出登录" onClick={onLogout}>
              <LogOut size={17} />
            </IconButton>
          )}
        </div>
      ) : (
        <Badge tone="info">企业内部系统</Badge>
      )}
    </header>
  );
}

function ExamFrame({
  children,
  onTasks,
  onLogout,
}: {
  children: React.ReactNode;
  onTasks: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="exam-prototype">
      <ExamBrand onTasks={onTasks} onLogout={onLogout} />
      {children}
    </div>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <label className="exam-field" htmlFor={id}>
      <span>{label}</span>
      <span className="exam-password-input">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
        />
        <IconButton
          type="button"
          label={show ? "隐藏密码" : "显示密码"}
          onClick={onToggle}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </IconButton>
      </span>
    </label>
  );
}

function LoginPage({ scenario, navigateTo, setScenario }: PageProps) {
  const [account, setAccount] = useState("A02418");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [feedback, setFeedback] = useState("");
  const isLocked = scenario === "locked";
  const isUnsupported = scenario === "unsupported";
  const isFirstLogin = scenario === "first-login";
  const isRecovery = scenario === "recovery";

  const passwordRules = [
    {
      label: "8 - 64 个字符",
      valid: password.length >= 8 && password.length <= 64,
    },
    {
      label: "大写、小写、数字、特殊字符至少三类",
      valid:
        [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((rule) =>
          rule.test(password),
        ).length >= 3,
    },
    {
      label: "两次输入一致",
      valid: Boolean(password) && password === confirmPassword,
    },
  ];
  const passwordReady = passwordRules.every((rule) => rule.valid);

  const submitLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (!account.trim() || !password) {
      setFeedback("请输入企业账号和密码");
      return;
    }
    if (account.toLowerCase() === "error") {
      setFeedback("账号或密码错误，或账号暂不可用");
      return;
    }
    navigateTo("EX-02");
  };

  const completePassword = (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordReady) return;
    if (isRecovery) {
      setFeedback("密码已重置，所有旧会话已失效，请重新登录");
      setRecoveryStep(1);
      setScenario("standard");
      return;
    }
    navigateTo("EX-02");
  };

  const recoveryBody = () => {
    if (recoveryStep === 1)
      return (
        <form
          className="exam-auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            setRecoveryStep(2);
          }}
        >
          <label className="exam-field" htmlFor="recovery-account">
            <span>企业账号</span>
            <input
              id="recovery-account"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
            />
          </label>
          <label className="exam-field" htmlFor="recovery-phone">
            <span>档案手机号</span>
            <input
              id="recovery-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="请输入完整手机号"
              inputMode="tel"
            />
          </label>
          <p className="exam-form-note">
            无论信息是否匹配，页面都使用相同反馈。
          </p>
          <Button type="submit" disabled={!account.trim() || phone.length < 8}>
            验证账号信息
            <ArrowRight size={16} />
          </Button>
        </form>
      );
    if (recoveryStep === 2)
      return (
        <form
          className="exam-auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.length === 6) setRecoveryStep(3);
          }}
        >
          <Banner title="若信息匹配，验证码将发送至档案手机号" tone="info">
            验证码 5 分钟有效，60 秒后可重新发送。
          </Banner>
          <label className="exam-field" htmlFor="recovery-code">
            <span>6 位短信验证码</span>
            <input
              id="recovery-code"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              placeholder="000000"
            />
          </label>
          <div className="exam-form-row">
            <Button variant="secondary" type="button" disabled>
              重新发送 42s
            </Button>
            <Button type="submit" disabled={code.length !== 6}>
              验证并继续
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      );
    return (
      <form className="exam-auth-form" onSubmit={completePassword}>
        <PasswordInput
          id="recovery-password"
          label="设置新密码"
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
          autoComplete="new-password"
        />
        <PasswordInput
          id="recovery-confirm"
          label="确认新密码"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
          autoComplete="new-password"
        />
        <PasswordRules rules={passwordRules} />
        <Button type="submit" disabled={!passwordReady}>
          重置密码
          <KeyRound size={16} />
        </Button>
      </form>
    );
  };

  return (
    <div className="exam-prototype exam-prototype--auth">
      <ExamBrand loggedIn={false} />
      <main className="exam-auth-layout">
        <section className="exam-auth-context" aria-label="正式考试端说明">
          <span className="exam-context-icon">
            <MonitorCheck size={28} />
          </span>
          <p className="exam-eyebrow">桌面 Web 正式考试端</p>
          <h1>使用企业账号参加考试</h1>
          <p>
            试卷在首次开始时固定，答案逐题保存。刷新、重新登录或换浏览器后仍恢复同一尝试。
          </p>
          <div className="exam-context-facts">
            <span>
              <ShieldCheck size={16} />
              仅限企业内部员工
            </span>
            <span>
              <Clock3 size={16} />
              考试时间由服务端控制
            </span>
          </div>
        </section>
        <section className="exam-auth-panel">
          {scenario === "session-expired" && (
            <Banner title="会话已失效" tone="warning">
              重新登录后将恢复原考试，不会重新抽卷。
            </Banner>
          )}
          {isUnsupported && (
            <Banner title="当前浏览器不在支持范围" tone="danger">
              请使用 Chrome 或 Edge 最近两个主版本。当前环境不能开始新考试。
            </Banner>
          )}
          {isLocked && (
            <Banner title="暂时无法登录" tone="danger">
              请在 14:32 后重试，或使用“忘记密码”恢复账号。
            </Banner>
          )}
          <div className="exam-auth-heading">
            <span>
              {isFirstLogin ? (
                <LockKeyhole size={21} />
              ) : isRecovery ? (
                <MailCheck size={21} />
              ) : (
                <UserRound size={21} />
              )}
            </span>
            <div>
              <h2>
                {isFirstLogin
                  ? "首次登录，请设置新密码"
                  : isRecovery
                    ? "找回密码"
                    : "员工登录"}
              </h2>
              <p>
                {isFirstLogin
                  ? "完成改密前无法访问考试任务"
                  : isRecovery
                    ? `步骤 ${recoveryStep} / 3`
                    : "请输入企业统一账号凭据"}
              </p>
            </div>
          </div>
          {feedback && (
            <div className="exam-inline-feedback" role="alert">
              <AlertCircle size={16} />
              {feedback}
            </div>
          )}
          {isRecovery ? (
            recoveryBody()
          ) : isFirstLogin ? (
            <form className="exam-auth-form" onSubmit={completePassword}>
              <div className="exam-readonly-account">
                <span>企业账号</span>
                <strong>A02418</strong>
              </div>
              <PasswordInput
                id="first-password"
                label="新密码"
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete="new-password"
              />
              <PasswordInput
                id="first-confirm"
                label="确认新密码"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete="new-password"
              />
              <PasswordRules rules={passwordRules} />
              <Button type="submit" disabled={!passwordReady}>
                完成改密并进入任务
                <ArrowRight size={16} />
              </Button>
            </form>
          ) : (
            <form className="exam-auth-form" onSubmit={submitLogin}>
              <label className="exam-field" htmlFor="login-account">
                <span>企业账号（工号）</span>
                <input
                  id="login-account"
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  autoComplete="username"
                />
              </label>
              <PasswordInput
                id="login-password"
                label="密码"
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete="current-password"
              />
              <Button type="submit" disabled={isLocked || isUnsupported}>
                登录
                <ArrowRight size={16} />
              </Button>
              <button
                className="exam-text-button"
                type="button"
                onClick={() => {
                  setFeedback("");
                  setScenario("recovery");
                }}
              >
                忘记密码
              </button>
            </form>
          )}
          {isRecovery && (
            <button
              className="exam-text-button exam-text-button--back"
              type="button"
              onClick={() => {
                setRecoveryStep(1);
                setScenario("standard");
              }}
            >
              <ArrowLeft size={14} />
              返回登录
            </button>
          )}
        </section>
      </main>
      <footer className="exam-auth-footer">
        <span>支持桌面 Chrome、Edge 最近两个主版本</span>
        <span>业务时间以企业时区展示</span>
      </footer>
    </div>
  );
}

function PasswordRules({
  rules,
}: {
  rules: { label: string; valid: boolean }[];
}) {
  return (
    <ul className="exam-password-rules">
      {rules.map((rule) => (
        <li className={rule.valid ? "is-valid" : ""} key={rule.label}>
          {rule.valid ? (
            <CheckCircle2 size={14} />
          ) : (
            <span className="exam-rule-dot" />
          )}
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

interface ExamTask {
  id: string;
  name: string;
  group: Exclude<TaskFilter, "all">;
  lifecycle: string;
  running: string;
  participation: string;
  openAt: string;
  stopAt: string;
  duration: string;
  attempts: string;
  action:
    | "查看说明"
    | "开始考试"
    | "继续考试"
    | "查看处理中"
    | "再次考试"
    | "查看结果"
    | "查看状态"
    | "查看提交记录";
  note?: string;
}

function tasksForScenario(scenario: string): ExamTask[] {
  const primary: ExamTask = {
    id: "SEC-2026",
    name: "2026 年度信息安全考试",
    group: "active",
    lifecycle: "开放开卷",
    running: "正常",
    participation: "未参加",
    openAt: "2026-08-11 09:00",
    stopAt: "2026-08-12 18:00",
    duration: "60 分钟",
    attempts: "0 / 2",
    action: "开始考试",
  };
  if (scenario === "paused")
    Object.assign(primary, {
      running: "暂停中",
      participation: "考试中",
      attempts: "1 / 2",
      action: "继续考试",
      note: "平台异常已触发统一暂停，当前仅可查看最后确认答案。",
    });
  if (scenario === "closing")
    Object.assign(primary, {
      lifecycle: "收尾中",
      participation: "已交卷",
      attempts: "1 / 2",
      action: "查看提交记录",
      note: "正在确认整场结束状态，暂不公布最终结果。",
    });
  if (scenario === "no-retry")
    Object.assign(primary, {
      participation: "已交卷",
      attempts: "1 / 2",
      action: "查看提交记录",
      note: "本场已无后续参加机会，结果按考试设置公布。",
    });
  if (scenario === "canceled")
    Object.assign(primary, {
      group: "finished",
      lifecycle: "已取消",
      running: "正常",
      participation: "已参加无有效交卷",
      attempts: "1 / 2",
      action: "查看状态",
      note: "本场考试因企业统一安排已取消，原结果不具有官方效力。",
    });
  return [
    primary,
    {
      id: "POL-2026",
      name: "员工行为规范考试",
      group: "upcoming",
      lifecycle: "未开始",
      running: "正常",
      participation: "未参加",
      openAt: "2026-08-15 09:00",
      stopAt: "2026-08-15 18:00",
      duration: "45 分钟",
      attempts: "0 / 1",
      action: "查看说明",
    },
    {
      id: "DATA-2026",
      name: "数据合规基础考试",
      group: "finished",
      lifecycle: "已结束",
      running: "正常",
      participation: "已交卷",
      openAt: "2026-07-20 09:00",
      stopAt: "2026-07-20 16:00",
      duration: "40 分钟",
      attempts: "1 / 1",
      action: "查看结果",
    },
  ];
}

function TaskListPage({ scenario, navigateTo, setScenario }: PageProps) {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [examCode, setExamCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const allTasks =
    scenario === "empty" || scenario === "load-error"
      ? []
      : tasksForScenario(scenario);
  const tasks =
    filter === "all"
      ? allTasks
      : allTasks.filter((task) => task.group === filter);

  const locateExam = (event: React.FormEvent) => {
    event.preventDefault();
    if (examCode.trim().length < 4) {
      setCodeError("未找到可参加的考试");
      return;
    }
    setCodeError("");
    navigateTo("EX-03", "standard");
  };

  const openTask = (task: ExamTask) => {
    if (task.action === "继续考试")
      navigateTo("EX-04", scenario === "paused" ? "paused" : "standard");
    else if (task.action === "查看处理中") navigateTo("EX-04", "submitting");
    else if (task.action === "查看结果") navigateTo("EX-05", "standard");
    else if (task.action === "查看提交记录")
      navigateTo("EX-05", scenario === "closing" ? "closing" : "pending");
    else if (task.action === "查看状态") navigateTo("EX-03", "canceled");
    else
      navigateTo(
        "EX-03",
        task.action === "再次考试"
          ? "standard"
          : task.action === "查看说明"
            ? "standard"
            : "standard",
      );
  };

  return (
    <ExamFrame
      onTasks={() => setScenario("standard")}
      onLogout={() => navigateTo("EX-01")}
    >
      <main className="exam-page">
        <div className="exam-page-heading">
          <div>
            <p className="exam-eyebrow">正式考试</p>
            <h1>我的考试任务</h1>
            <p>时间按企业时区展示（Pacific/Auckland）</p>
          </div>
          <form className="exam-code-search" onSubmit={locateExam}>
            <label htmlFor="exam-code">考试码定位</label>
            <span>
              <input
                id="exam-code"
                value={examCode}
                onChange={(event) => setExamCode(event.target.value)}
                placeholder="输入考试码"
              />
              <Button type="submit">
                <Search size={16} />
                定位
              </Button>
            </span>
            {codeError && <small role="alert">{codeError}</small>}
          </form>
        </div>
        {scenario === "paused" && (
          <Banner title="平台暂停中" tone="warning">
            新开卷已暂停。已开始考试的员工可进入只读查看最后确认数据。
          </Banner>
        )}
        {scenario === "closing" && (
          <Banner title="收尾中，正在确认整场结束状态" tone="info">
            即使当前没有在途尝试，也必须等待 20 秒观察和服务端确认。
          </Banner>
        )}
        {scenario === "canceled" && (
          <Banner title="考试已取消" tone="danger">
            本场考试因企业统一安排已取消，原结果不具有官方效力。
          </Banner>
        )}
        <section className="exam-panel exam-task-panel">
          <SectionHeader
            title="任务列表"
            description="状态维度分开展示，主操作始终以服务端资格为准"
            action={
              <Segmented
                value={filter}
                options={[...taskFilterOptions]}
                onChange={setFilter}
                label="筛选考试任务"
              />
            }
          />
          {scenario === "load-error" ? (
            <EmptyState
              icon="error"
              title="任务加载失败"
              description="未保留上一账号的任何任务数据。"
              action={
                <Button
                  variant="secondary"
                  onClick={() => setScenario("standard")}
                >
                  <RefreshCw size={16} />
                  重新加载
                </Button>
              }
            />
          ) : tasks.length === 0 ? (
            <EmptyState
              title="暂无考试任务"
              description="您仍可使用上方考试码定位已分配的考试。"
            />
          ) : (
            <div className="exam-table-wrap">
              <table className="exam-table exam-task-table">
                <thead>
                  <tr>
                    <th>考试</th>
                    <th>生命周期 / 运行</th>
                    <th>本人参与</th>
                    <th>有效时间</th>
                    <th>次数</th>
                    <th>
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <strong>{task.name}</strong>
                        <small>{task.id}</small>
                        {task.note && (
                          <p className="exam-task-note">{task.note}</p>
                        )}
                      </td>
                      <td>
                        <div className="exam-badge-pair">
                          <Badge tone={toneForStatus(task.lifecycle)}>
                            {task.lifecycle}
                          </Badge>
                          <Badge tone={toneForStatus(task.running)}>
                            {task.running}
                          </Badge>
                        </div>
                      </td>
                      <td>
                        <Badge tone={toneForStatus(task.participation)}>
                          {task.participation}
                        </Badge>
                      </td>
                      <td>
                        <span className="exam-time-range">
                          <small>开放 {task.openAt}</small>
                          <small>停止新开卷 {task.stopAt}</small>
                          <small>单次 {task.duration}</small>
                        </span>
                      </td>
                      <td>
                        <strong>{task.attempts}</strong>
                      </td>
                      <td>
                        <Button
                          variant={
                            task.action === "开始考试" ||
                            task.action === "继续考试"
                              ? "primary"
                              : "secondary"
                          }
                          onClick={() => openTask(task)}
                        >
                          {task.action}
                          <ChevronRight size={15} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </ExamFrame>
  );
}

function QualificationPage({ scenario, navigateTo }: PageProps) {
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const isResume = scenario === "resume";
  const isPaused = scenario === "paused" || scenario === "paused-active";
  const hasPausedAttempt = scenario === "paused-active";
  const isClosing = scenario === "closing";
  const isCanceled = scenario === "canceled";
  const isUnsupported = scenario === "unsupported";
  const noRetry = scenario === "no-retry";
  const isProcessing = scenario === "processing";
  const isRetry = scenario === "retry" || scenario === "retry-after-void";
  const nextAttemptNumber = scenario === "retry-after-void" ? 3 : 2;

  let primaryAction: React.ReactNode = (
    <Button onClick={() => setShowStartConfirm(true)}>
      <ClipboardCheck size={16} />
      {isRetry ? `开始第 ${nextAttemptNumber} 次考试` : "开始考试"}
    </Button>
  );
  if (isResume)
    primaryAction = (
      <Button onClick={() => navigateTo("EX-04", "standard")}>
        <RotateCcw size={16} />
        继续考试
      </Button>
    );
  if (isProcessing)
    primaryAction = (
      <Button onClick={() => navigateTo("EX-04", "standard")}>
        <LoaderCircle className="is-spinning" size={16} />
        查看开卷结果
      </Button>
    );
  if (hasPausedAttempt)
    primaryAction = (
      <Button variant="secondary" onClick={() => navigateTo("EX-04", "paused")}>
        <Eye size={16} />
        只读查看原尝试
      </Button>
    );
  if (noRetry)
    primaryAction = (
      <Button
        variant="secondary"
        onClick={() => navigateTo("EX-05", "pending")}
      >
        <FileCheck2 size={16} />
        查看提交记录
      </Button>
    );
  if (
    isClosing ||
    isCanceled ||
    isUnsupported ||
    (isPaused && !hasPausedAttempt)
  )
    primaryAction = null;

  return (
    <ExamFrame
      onTasks={() => navigateTo("EX-02")}
      onLogout={() => navigateTo("EX-01")}
    >
      <main className="exam-page">
        <button
          className="exam-back-link"
          type="button"
          onClick={() => navigateTo("EX-02")}
        >
          <ChevronLeft size={16} />
          返回考试任务
        </button>
        {isPaused && (
          <Banner title="平台暂停中" tone="warning">
            {hasPausedAttempt
              ? "您可进入答题页只读查看最后确认答案，暂时不能作答或交卷。"
              : "暂停期间不允许开始新尝试，请等待平台恢复。"}
          </Banner>
        )}
        {isClosing && (
          <Banner title="收尾中，正在确认整场结束状态" tone="info">
            服务端确认前不显示“已结束”或任何最终结果。
          </Banner>
        )}
        {isCanceled && (
          <Banner title="考试已取消" tone="danger">
            本场考试因企业统一安排已取消，不再提供开始、继续或复盘入口。
          </Banner>
        )}
        {isUnsupported && (
          <Banner title="当前环境不能开始新考试" tone="danger">
            请使用桌面 Chrome 或 Edge 最近两个主版本，并保证可用视口不小于 1280
            × 720。
          </Banner>
        )}
        {isProcessing && (
          <Banner title="正在确认唯一开卷结果" tone="info">
            请勿重复操作。并发请求若已创建尝试，将恢复同一份固定试卷。
          </Banner>
        )}
        <section className="exam-qualification-layout">
          <article className="exam-panel exam-instructions">
            <div className="exam-title-status">
              <div>
                <p className="exam-eyebrow">正式考试</p>
                <h1>2026 年度信息安全考试</h1>
              </div>
              <div className="exam-badge-pair">
                <Badge
                  tone={isClosing ? "warning" : isCanceled ? "danger" : "info"}
                >
                  {isClosing ? "收尾中" : isCanceled ? "已取消" : "开放开卷"}
                </Badge>
                <Badge tone={isPaused ? "warning" : "success"}>
                  {isPaused ? "暂停中" : "运行正常"}
                </Badge>
              </div>
            </div>
            <div className="exam-instruction-copy">
              <h2>考试说明</h2>
              <p>
                本次考试用于检验员工对信息安全基础制度、数据保护和账号安全要求的掌握情况。
              </p>
              <h3>作答规则</h3>
              <ol>
                <li>开始即计时，单次时长 60 分钟。</li>
                <li>答案在每次修改后立即保存，只有服务端确认才算已保存。</li>
                <li>个人网络或设备异常不补时，重新进入恢复原试卷。</li>
                <li>多选题需完全匹配标准答案才得分。</li>
              </ol>
            </div>
            <div className="exam-info-grid">
              <div>
                <span>开放开始</span>
                <strong>2026-08-11 09:00</strong>
              </div>
              <div>
                <span>停止新开卷</span>
                <strong>2026-08-12 18:00</strong>
              </div>
              <div>
                <span>单次时长</span>
                <strong>60 分钟</strong>
              </div>
              <div>
                <span>试卷概要</span>
                <strong>50 题 · 100 分</strong>
              </div>
            </div>
          </article>
          <aside className="exam-panel exam-qualification-card">
            <SectionHeader
              title="本人参加资格"
              description="以当前服务端判定为准"
            />
            <div className="exam-eligibility-list">
              <div>
                <span>应考资格</span>
                <strong>
                  <Check size={15} />
                  已分配
                </strong>
              </div>
              <div>
                <span>参与状态</span>
                <strong>
                  {isResume || hasPausedAttempt
                    ? "考试中"
                    : noRetry || isRetry
                      ? "已交卷"
                      : "未参加"}
                </strong>
              </div>
              <div>
                <span>已使用 / 最大次数</span>
                <strong>
                  {isResume || hasPausedAttempt || noRetry || isRetry
                    ? "1 / 2"
                    : "0 / 2"}
                </strong>
              </div>
              <div>
                <span>本次尝试</span>
                <strong>
                  {isResume || hasPausedAttempt
                    ? "第 1 次 · 10:03 开始"
                    : "尚未创建"}
                </strong>
              </div>
            </div>
            {isResume && (
              <div className="exam-attempt-summary">
                <TimerReset size={18} />
                <span>
                  <strong>原尝试可恢复</strong>
                  <small>有效到期时间 11:03，不重新抽卷或消耗次数。</small>
                </span>
              </div>
            )}
            {noRetry && (
              <Banner title="本场已无后续参加机会" tone="neutral">
                具体结果按考试展示策略公布。
              </Banner>
            )}
            <div className="exam-primary-action">
              {primaryAction}
              {!primaryAction && (
                <p>
                  {isCanceled
                    ? "已移除所有参加操作"
                    : isClosing
                      ? "当前无可用参加操作"
                      : isUnsupported
                        ? "请更换受支持的桌面浏览器"
                        : "请等待平台恢复"}
                </p>
              )}
            </div>
            <p className="exam-form-note">
              始终只显示一个主操作。结构化及格分在通过结论获准公开前不返回。
            </p>
          </aside>
        </section>
      </main>
      {showStartConfirm && (
        <Modal
          title="确认开始考试"
          confirmLabel="开始并计时"
          onCancel={() => setShowStartConfirm(false)}
          onConfirm={() =>
            navigateTo(
              "EX-04",
              isRetry
                ? nextAttemptNumber === 3
                  ? "third-attempt"
                  : "second-attempt"
                : "standard",
            )
          }
        >
          <div className="exam-confirm-list">
            <p>
              本次将创建第 {isRetry ? nextAttemptNumber : 1} 次尝试，并消耗 1
              次参加次数。
            </p>
            <ul>
              <li>单次时长：60 分钟</li>
              <li>开始后立即按服务端时间计时</li>
              <li>个人网络或设备问题不补时</li>
            </ul>
          </div>
        </Modal>
      )}
    </ExamFrame>
  );
}

type SaveState = "idle" | "saving" | "saved" | "failed" | "conflict";

interface ExamQuestion {
  id: number;
  type: "单选题" | "多选题" | "判断题";
  points: number;
  stem: string;
  options: { key: string; label: string }[];
}

const examQuestions: ExamQuestion[] = [
  {
    id: 1,
    type: "单选题",
    points: 2,
    stem: "收到自称企业 IT 部门的邮件，要求点击链接重置密码时，最合适的处理方式是？",
    options: [
      { key: "A", label: "立即点击链接以避免账号被锁定" },
      { key: "B", label: "通过企业官方通道确认邮件真实性" },
      { key: "C", label: "将邮件转发给同事询问" },
      { key: "D", label: "回复邮件索要更多个人信息" },
    ],
  },
  {
    id: 2,
    type: "多选题",
    points: 2,
    stem: "以下哪些行为有助于降低账号被盗风险？",
    options: [
      { key: "A", label: "为不同系统使用不同的强密码" },
      { key: "B", label: "将密码保存在桌面文本文件中" },
      { key: "C", label: "开启多因素认证" },
      { key: "D", label: "定期将验证码分享给管理员" },
    ],
  },
  {
    id: 3,
    type: "判断题",
    points: 2,
    stem: "在公共 Wi-Fi 环境中，只要网页能正常打开，就可以处理企业敏感数据。",
    options: [
      { key: "正确", label: "正确" },
      { key: "错误", label: "错误" },
    ],
  },
  {
    id: 4,
    type: "单选题",
    points: 2,
    stem: "发现疑似企业数据泄露后，首先应当做什么？",
    options: [
      { key: "A", label: "自行删除所有相关文件" },
      { key: "B", label: "在公开社交平台寻求帮助" },
      { key: "C", label: "保留现场并按企业流程立即上报" },
      { key: "D", label: "等待其他同事先行处理" },
    ],
  },
  {
    id: 5,
    type: "多选题",
    points: 2,
    stem: "离开工位前，哪些安全操作是必要的？",
    options: [
      { key: "A", label: "锁定电脑屏幕" },
      { key: "B", label: "收好含敏感信息的纸质材料" },
      { key: "C", label: "保持所有业务系统登录状态" },
      { key: "D", label: "取走或安全存放移动存储设备" },
    ],
  },
  {
    id: 6,
    type: "判断题",
    points: 2,
    stem: "工作邮箱的密码可以与个人社交媒体账号使用相同密码。",
    options: [
      { key: "正确", label: "正确" },
      { key: "错误", label: "错误" },
    ],
  },
  {
    id: 7,
    type: "单选题",
    points: 2,
    stem: "使用企业授权的移动存储设备时，下列哪项最符合要求？",
    options: [
      { key: "A", label: "仅存储工作必需数据并遵循加密要求" },
      { key: "B", label: "可同时保存个人影视资料" },
      { key: "C", label: "可将设备借给家人使用" },
      { key: "D", label: "无需在遗失后报告" },
    ],
  },
  {
    id: 8,
    type: "判断题",
    points: 2,
    stem: "业务数据的访问权限应当遵循最小必要原则。",
    options: [
      { key: "正确", label: "正确" },
      { key: "错误", label: "错误" },
    ],
  },
];

function AnswerSaveState({ state }: { state: SaveState }) {
  if (state === "saving")
    return (
      <span className="exam-save-state is-saving">
        <LoaderCircle className="is-spinning" size={15} />
        保存中
      </span>
    );
  if (state === "saved")
    return (
      <span className="exam-save-state is-saved">
        <CheckCircle2 size={15} />
        已保存 · 10:20:18
      </span>
    );
  if (state === "failed")
    return (
      <span className="exam-save-state is-failed">
        <XCircle size={15} />
        保存失败
      </span>
    );
  if (state === "conflict")
    return (
      <span className="exam-save-state is-conflict">
        <TriangleAlert size={15} />
        版本冲突
      </span>
    );
  return <span className="exam-save-state">尚未作答</span>;
}

function WorkbenchPage({ scenario, navigateTo, setScenario }: PageProps) {
  const [attemptNumber] = useState(
    scenario === "third-attempt" ? 3 : scenario === "second-attempt" ? 2 : 1,
  );
  const [currentId, setCurrentId] = useState(2);
  const [answers, setAnswers] = useState<Record<number, string[]>>({
    1: ["B"],
    2: ["A", "C"],
    4: ["C"],
    6: ["错误"],
  });
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitBlocked, setSubmitBlocked] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const currentQuestion =
    examQuestions.find((question) => question.id === currentId) ??
    examQuestions[0];
  const isOffline = scenario === "offline";
  const readOnly = [
    "paused",
    "expiry-observe",
    "submitting",
    "invalidated",
    "canceled",
  ].includes(scenario);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    if (scenario === "saving") setSaveState("saving");
    else if (scenario === "save-failed" || scenario === "offline")
      setSaveState("failed");
    else if (scenario === "conflict") setSaveState("conflict");
    else setSaveState(answersRef.current[currentId]?.length ? "saved" : "idle");
    return () => window.clearTimeout(saveTimer.current);
  }, [scenario, currentId]);

  const choose = (key: string) => {
    if (readOnly) return;
    setAnswers((previous) => {
      const selected = previous[currentId] ?? [];
      const next =
        currentQuestion.type === "多选题"
          ? selected.includes(key)
            ? selected.filter((item) => item !== key)
            : [...selected, key]
          : [key];
      return { ...previous, [currentId]: next };
    });
    setSubmitBlocked(false);
    if (isOffline) {
      setSaveState("failed");
      return;
    }
    setSaveState("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaveState("saved"), 700);
  };

  const stateForQuestion = (questionId: number): SaveState => {
    if (questionId === currentId) return saveState;
    return answers[questionId]?.length ? "saved" : "idle";
  };

  const answeredCount = Object.values(answers).filter(
    (answer) => answer.length > 0,
  ).length;
  const canSubmit =
    !readOnly &&
    !isOffline &&
    saveState !== "failed" &&
    saveState !== "saving" &&
    saveState !== "conflict";
  const requestSubmit = () => {
    if (!canSubmit) {
      setSubmitBlocked(true);
      return;
    }
    setShowSubmit(true);
  };

  return (
    <div className="exam-prototype exam-prototype--workbench">
      <header className="exam-workbench-bar">
        <div>
          <ShieldCheck size={19} />
          <span>
            <strong>2026 年度信息安全考试</strong>
            <small>第 {attemptNumber} 次尝试</small>
          </span>
        </div>
        <div className="exam-workbench-summary">
          <span>
            <ListChecks size={16} />第 {currentId} / 50 题
          </span>
          <span className={saveState === "failed" ? "is-danger" : ""}>
            {saveState === "failed" ? (
              <XCircle size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            {saveState === "failed" ? "存在保存失败" : "其他已作答题目已保存"}
          </span>
        </div>
        <div
          className={`exam-timer ${scenario === "paused" ? "is-paused" : scenario === "expiry-observe" ? "is-expired" : ""}`}
        >
          <Clock3 size={18} />
          <span>
            <small>
              {scenario === "paused"
                ? "计时已暂停"
                : scenario === "expiry-observe"
                  ? "答题时间已到"
                  : "剩余时间"}
            </small>
            <strong>
              {scenario === "paused"
                ? "--:--"
                : scenario === "expiry-observe"
                  ? "00:00"
                  : "42:16"}
            </strong>
          </span>
        </div>
      </header>
      <main className="exam-workbench-main">
        <div className="exam-workbench-notices" aria-live="polite">
          {isOffline && (
            <Banner
              title="网络连接已断开"
              tone="danger"
              action={
                <Button
                  variant="secondary"
                  onClick={() => setScenario("standard")}
                >
                  <RefreshCw size={15} />
                  模拟恢复网络
                </Button>
              }
            >
              计时仍继续。未获服务端确认的选择不会显示为已保存。
            </Banner>
          )}
          {scenario === "paused" && (
            <Banner title="平台暂停，当前试卷只读" tone="warning">
              页面仅展示最后确认答案。补时确认后将重新同步有效到期时间。
            </Banner>
          )}
          {scenario === "expiry-observe" && (
            <Banner title="答题时间已到，正在确认平台运行状态" tone="info">
              当前为 20 秒到期观察，试卷尚未标记已提交，也不接受新的答案修改。
            </Banner>
          )}
          {scenario === "submitting" && (
            <Banner
              title="交卷处理中"
              tone="info"
              action={
                <Button
                  variant="secondary"
                  onClick={() => navigateTo("EX-05", "pending")}
                >
                  查看结果状态
                  <ChevronRight size={15} />
                </Button>
              }
            >
              试卷已锁定。您可以安全关闭页面，重新进入仍会显示同一处理状态。
            </Banner>
          )}
          {scenario === "conflict" && (
            <Banner
              title="其他页面已更新本题答案"
              tone="warning"
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAnswers((previous) => ({
                      ...previous,
                      [currentId]: ["A"],
                    }));
                    setScenario("standard");
                  }}
                >
                  加载服务端答案
                </Button>
              }
            >
              较旧版本已被拒绝。请加载最新答案后再次确认是否修改。
            </Banner>
          )}
          {scenario === "save-failed" && (
            <Banner
              title="第 2 题保存失败"
              tone="danger"
              action={
                <Button
                  variant="secondary"
                  onClick={() => setScenario("standard")}
                >
                  <RefreshCw size={15} />
                  重试保存
                </Button>
              }
            >
              失败状态会持续保留，手动交卷前必须先完成确认。
            </Banner>
          )}
          {scenario === "invalidated" && (
            <Banner
              title="本次尝试已失效"
              tone="danger"
              action={
                <Button
                  variant="secondary"
                  onClick={() => navigateTo("EX-03", "standard")}
                >
                  返回资格页
                </Button>
              }
            >
              企业已作废本次尝试并返还参加次数。请返回后重新确认参加资格。
            </Banner>
          )}
          {scenario === "canceled" && (
            <Banner
              title="考试已取消"
              tone="danger"
              action={
                <Button
                  variant="secondary"
                  onClick={() => navigateTo("EX-03", "canceled")}
                >
                  退出答题
                </Button>
              }
            >
              本场考试因企业统一安排已取消，当前答案只读，不开放结果复盘。
            </Banner>
          )}
          {submitBlocked && (
            <Banner
              title="尚有答案未确认，无法交卷"
              tone="danger"
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCurrentId(2);
                    setSubmitBlocked(false);
                  }}
                >
                  定位第 2 题
                </Button>
              }
            >
              请处理保存中、保存失败或版本冲突的题目。
            </Banner>
          )}
        </div>
        <div className="exam-workspace-grid">
          <section className="exam-question-panel">
            <div className="exam-question-meta">
              <span>
                <Badge tone="info">{currentQuestion.type}</Badge>
                <span>本题 {currentQuestion.points} 分</span>
              </span>
              <AnswerSaveState state={saveState} />
            </div>
            <div className="exam-question-stem">
              <span>{currentQuestion.id}</span>
              <h1>{currentQuestion.stem}</h1>
            </div>
            <fieldset className="exam-options" disabled={readOnly}>
              <legend className="sr-only">请选择答案</legend>
              {currentQuestion.options.map((option) => {
                const checked = (answers[currentId] ?? []).includes(option.key);
                return (
                  <label
                    className={`exam-option ${checked ? "is-selected" : ""}`}
                    key={option.key}
                  >
                    <input
                      type={
                        currentQuestion.type === "多选题" ? "checkbox" : "radio"
                      }
                      name={`question-${currentId}`}
                      checked={checked}
                      onChange={() => choose(option.key)}
                    />
                    <span className="exam-option-key">{option.key}</span>
                    <span>{option.label}</span>
                    {checked && <Check size={17} />}
                  </label>
                );
              })}
            </fieldset>
            <footer className="exam-question-footer">
              <Button
                variant="secondary"
                disabled={currentId === 1}
                onClick={() => setCurrentId((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft size={16} />
                上一题
              </Button>
              <span>可直接切题，原题保存状态会继续更新</span>
              <Button
                variant="secondary"
                disabled={currentId === examQuestions.length}
                onClick={() =>
                  setCurrentId((value) =>
                    Math.min(examQuestions.length, value + 1),
                  )
                }
              >
                下一题
                <ChevronRight size={16} />
              </Button>
            </footer>
          </section>
          <aside className="exam-answer-sheet">
            <div className="exam-answer-sheet__heading">
              <div>
                <h2>答题卡</h2>
                <p>
                  已答 {answeredCount} / {examQuestions.length} 题
                </p>
              </div>
              <ProgressBar
                value={(answeredCount / examQuestions.length) * 100}
                label="作答进度"
              />
            </div>
            <div className="exam-answer-grid">
              {examQuestions.map((question) => {
                const state = stateForQuestion(question.id);
                const label =
                  state === "saving"
                    ? "保存中"
                    : state === "failed"
                      ? "保存失败"
                      : state === "conflict"
                        ? "版本冲突"
                        : state === "saved"
                          ? "已答已保存"
                          : "未答";
                return (
                  <button
                    key={question.id}
                    className={`exam-answer-tile is-${state} ${question.id === currentId ? "is-current" : ""}`}
                    onClick={() => setCurrentId(question.id)}
                    aria-label={`第 ${question.id} 题，${label}`}
                    title={label}
                  >
                    <span>{question.id}</span>
                    {state === "saved" ? (
                      <Check size={12} />
                    ) : state === "saving" ? (
                      <LoaderCircle className="is-spinning" size={12} />
                    ) : state === "failed" || state === "conflict" ? (
                      <AlertCircle size={12} />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="exam-answer-legend">
              <span>
                <i className="is-saved" />
                已保存
              </span>
              <span>
                <i className="is-saving" />
                保存中
              </span>
              <span>
                <i className="is-failed" />
                需处理
              </span>
              <span>
                <i />
                未答
              </span>
            </div>
            <Button
              className="exam-submit-button"
              variant="primary"
              disabled={readOnly}
              onClick={requestSubmit}
            >
              <FileCheck2 size={17} />
              提交试卷
            </Button>
            <p>交卷前必须完成所有待确认保存，不提供忽略失败继续交卷。</p>
          </aside>
        </div>
      </main>
      {showSubmit && (
        <Modal
          title="确认提交试卷"
          confirmLabel="确认交卷"
          onCancel={() => setShowSubmit(false)}
          onConfirm={() => {
            setShowSubmit(false);
            setScenario("submitting");
          }}
        >
          <div className="exam-submit-summary">
            <div>
              <span>已答</span>
              <strong>{answeredCount} 题</strong>
            </div>
            <div>
              <span>未答</span>
              <strong>{examQuestions.length - answeredCount} 题</strong>
            </div>
            <p>
              当前为第 {attemptNumber}
              次尝试。提交后试卷立即锁定，不得再修改答案。
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

const reviewItems = [
  {
    id: 1,
    type: "单选题",
    points: "2 / 2 分",
    state: "正确",
    stem: "收到自称企业 IT 部门的邮件，要求点击链接重置密码时，最合适的处理方式是？",
    mine: "B. 通过企业官方通道确认邮件真实性",
    correct: "B",
    analysis:
      "对涉及凭据的紧急邮件，应使用独立的企业官方通道验证，不直接信任邮件内链接。",
  },
  {
    id: 2,
    type: "多选题",
    points: "0 / 2 分",
    state: "错误",
    stem: "以下哪些行为有助于降低账号被盗风险？",
    mine: "A",
    correct: "A、C",
    analysis: "多选题采用严格评分，少选、多选或错选均不得分。",
  },
  {
    id: 3,
    type: "判断题",
    points: "0 / 2 分",
    state: "未作答",
    stem: "在公共 Wi-Fi 环境中，只要网页能正常打开，就可以处理企业敏感数据。",
    mine: "未作答",
    correct: "错误",
    analysis: "公共网络环境不可信，处理敏感数据应使用企业授权的安全连接方式。",
  },
];

function RestrictedResult({
  scenario,
  navigateTo,
}: {
  scenario: string;
  navigateTo: SurfacePrototypeProps["navigateTo"];
}) {
  const config =
    scenario === "locked"
      ? {
          icon: <ShieldAlert size={28} />,
          title: "结果锁定，异常处理中",
          copy: "当前仅确认您已提交试卷。请等待企业通知。",
          tone: "danger" as Tone,
        }
      : scenario === "closing"
        ? {
            icon: <Clock3 size={28} />,
            title: "收尾中，正在确认结果公开状态",
            copy: "整场结束观察与服务端确认尚未完成。",
            tone: "info" as Tone,
          }
        : scenario === "paused"
          ? {
              icon: <TimerReset size={28} />,
              title: "考试暂停中",
              copy: "请等待平台恢复与统一时间补偿确认。",
              tone: "warning" as Tone,
            }
          : {
              icon: <Clock3 size={28} />,
              title: "试卷已提交，结果待公布",
              copy: "结果将按本场考试的公开策略展示。",
              tone: "neutral" as Tone,
            };
  return (
    <section className={`exam-result-restricted tone-${config.tone}`}>
      <span>{config.icon}</span>
      <p className="exam-eyebrow">已提交事实</p>
      <h1>{config.title}</h1>
      <p>{config.copy}</p>
      <dl>
        <div>
          <dt>尝试序号</dt>
          <dd>第 1 次</dd>
        </div>
        <div>
          <dt>尝试状态</dt>
          <dd>已提交</dd>
        </div>
        <div>
          <dt>提交时间</dt>
          <dd>2026-08-11 10:48</dd>
        </div>
      </dl>
      <p className="exam-result-privacy">
        <LockKeyhole size={15} />
        当前内容不包含官方成绩、逐题内容或任何可推导结果的标识。
      </p>
      <div className="exam-result-restricted__actions">
        <Button variant="secondary" onClick={() => navigateTo("EX-02")}>
          <ArrowLeft size={16} />
          返回考试任务
        </Button>
        {scenario === "pending" && (
          <Button onClick={() => navigateTo("EX-05", "standard")}>
            <RefreshCw size={16} />
            刷新结果状态
          </Button>
        )}
      </div>
    </section>
  );
}

function ResultPage({ scenario, navigateTo }: PageProps) {
  const [selectedAttempt, setSelectedAttempt] = useState(1);
  const [selectedReview, setSelectedReview] = useState(1);
  const restricted = ["pending", "closing", "paused", "locked"].includes(
    scenario,
  );
  const canceled = scenario === "canceled";
  const reviewAllowed = scenario === "standard";
  const passVisible = scenario !== "pass-hidden";
  const isVoided = scenario === "voided";
  const retryAvailable = scenario === "retry" || isVoided;
  const nextAttemptNumber = isVoided ? 3 : 2;
  const score = retryAvailable ? "72" : "88";

  if (restricted)
    return (
      <ExamFrame
        onTasks={() => navigateTo("EX-02")}
        onLogout={() => navigateTo("EX-01")}
      >
        <main className="exam-page exam-result-page">
          <RestrictedResult scenario={scenario} navigateTo={navigateTo} />
        </main>
      </ExamFrame>
    );

  if (canceled)
    return (
      <ExamFrame
        onTasks={() => navigateTo("EX-02")}
        onLogout={() => navigateTo("EX-01")}
      >
        <main className="exam-page exam-result-page">
          <section className="exam-result-restricted tone-danger">
            <span>
              <XCircle size={28} />
            </span>
            <p className="exam-eyebrow">考试状态</p>
            <h1>本场考试已取消</h1>
            <p>本场考试因企业统一安排已取消，所有结果不具有官方效力。</p>
            <dl>
              <div>
                <dt>取消时间</dt>
                <dd>2026-08-11 11:26</dd>
              </div>
              <div>
                <dt>复盘权限</dt>
                <dd>已关闭</dd>
              </div>
            </dl>
            <p className="exam-result-privacy">
              <LockKeyhole size={15} />
              本页不提供成绩、标准答案或解析。
            </p>
            <Button variant="secondary" onClick={() => navigateTo("EX-02")}>
              <ArrowLeft size={16} />
              返回考试任务
            </Button>
          </section>
        </main>
      </ExamFrame>
    );

  const activeReview =
    reviewItems.find((item) => item.id === selectedReview) ?? reviewItems[0];
  return (
    <ExamFrame
      onTasks={() => navigateTo("EX-02")}
      onLogout={() => navigateTo("EX-01")}
    >
      <main className="exam-page exam-result-page">
        <button
          className="exam-back-link"
          type="button"
          onClick={() => navigateTo("EX-02")}
        >
          <ChevronLeft size={16} />
          返回考试任务
        </button>
        <section className="exam-result-heading">
          <div>
            <p className="exam-eyebrow">正式考试结果</p>
            <h1>2026 年度信息安全考试</h1>
            <div className="exam-badge-pair">
              <Badge tone="success">已结束</Badge>
              <Badge tone="success">已交卷</Badge>
              {passVisible && (
                <Badge tone={retryAvailable ? "warning" : "success"}>
                  {retryAvailable ? "未通过" : "已通过"}
                </Badge>
              )}
            </div>
          </div>
          {retryAvailable ? (
            <Button
              onClick={() =>
                navigateTo("EX-03", isVoided ? "retry-after-void" : "retry")
              }
            >
              <RotateCcw size={16} />
              开始第 {nextAttemptNumber} 次考试
            </Button>
          ) : (
            <p className="exam-result-action-note">
              <CheckCircle2 size={18} />
              本场已无后续参加机会
            </p>
          )}
        </section>
        {isVoided && (
          <Banner title="尝试作废后已重新计算官方成绩" tone="warning">
            第 2 次尝试原 96 分已作废并返还次数；当前有效 / 总尝试为 1 / 2，
            官方成绩回算为第 1 次尝试的 72 分。
          </Banner>
        )}
        <section className="exam-panel exam-result-summary">
          <SectionHeader
            title="官方结果"
            description="仅展示已开启且已到公开时机的汇总项"
          />
          <div className="exam-result-metrics">
            <Metric
              label="官方得分"
              value={`${score} / 100`}
              tone={retryAvailable ? "warning" : "success"}
              hint="取最高有效分"
            />
            {passVisible && (
              <Metric
                label="是否通过"
                value={retryAvailable ? "未通过" : "已通过"}
                tone={retryAvailable ? "warning" : "success"}
              />
            )}
            <Metric
              label={
                isVoided
                  ? "有效 / 总尝试"
                  : retryAvailable
                    ? "已使用 / 最大次数"
                    : "正确 / 错误"
              }
              value={retryAvailable ? "1 / 2" : "44 / 6"}
              hint={
                isVoided
                  ? "作废尝试保留历史但不占次数"
                  : retryAvailable
                    ? "仅有 1 次已完成历史"
                    : "未答题计入错题口径"
              }
            />
            <Metric
              label="有效用时"
              value={isVoided ? "51:40" : "48:23"}
              hint="服务端时间"
            />
          </div>
          {!passVisible && (
            <Banner title="已按策略公开官方得分" tone="neutral">
              “是否通过”未获准公开，本页不返回该结论或结构化及格分。
            </Banner>
          )}
        </section>
        <section className="exam-panel exam-attempts-panel">
          <SectionHeader
            title="我的尝试"
            description="官方尝试标识仅在官方得分公开后显示"
          />
          <div className="exam-table-wrap">
            <table className="exam-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>尝试状态</th>
                  <th>开始 / 提交</th>
                  <th>得分</th>
                  <th>官方口径</th>
                  <th>
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className={selectedAttempt === 1 ? "is-selected" : ""}>
                  <td>第 1 次</td>
                  <td>
                    <Badge tone="success">已完成</Badge>
                  </td>
                  <td>
                    <span className="exam-time-range">
                      <small>{isVoided ? "09:04" : "10:00"} 开始</small>
                      <small>{isVoided ? "09:55" : "10:48"} 提交</small>
                      {isVoided && <small>有效用时 51:40</small>}
                    </span>
                  </td>
                  <td>
                    <strong>{score}</strong>
                  </td>
                  <td>
                    <Badge tone="info">官方尝试</Badge>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedAttempt(1)}
                    >
                      查看
                    </Button>
                  </td>
                </tr>
                {isVoided && (
                  <tr className={selectedAttempt === 2 ? "is-selected" : ""}>
                    <td>第 2 次</td>
                    <td>
                      <Badge tone="danger">已作废</Badge>
                      <small className="exam-void-note">
                        企业确认本次尝试不计入官方结果
                      </small>
                    </td>
                    <td>
                      <span className="exam-time-range">
                        <small>10:02 开始</small>
                        <small>10:44 提交</small>
                        <small>用时 42:18</small>
                      </span>
                    </td>
                    <td>
                      <strong>原 96</strong>
                    </td>
                    <td>不计成绩、不计次数</td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedAttempt(2)}
                      >
                        查看
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {reviewAllowed ? (
          <section className="exam-panel exam-review-panel">
            <SectionHeader
              title="逐题复盘"
              description="整场已结束、已无合法作答机会，且管理员已开启答案与解析"
            />
            <div className="exam-review-layout">
              <nav className="exam-review-list" aria-label="复盘题目">
                {reviewItems.map((item) => (
                  <button
                    key={item.id}
                    className={selectedReview === item.id ? "is-active" : ""}
                    onClick={() => setSelectedReview(item.id)}
                  >
                    <span>{item.id}</span>
                    <span>
                      <strong>{item.type}</strong>
                      <small>
                        {item.state} · {item.points}
                      </small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </nav>
              <article className="exam-review-detail">
                <div className="exam-question-meta">
                  <span>
                    <Badge tone="info">{activeReview.type}</Badge>
                    <Badge
                      tone={
                        activeReview.state === "正确" ? "success" : "danger"
                      }
                    >
                      {activeReview.state}
                    </Badge>
                  </span>
                  <strong>{activeReview.points}</strong>
                </div>
                <h2>
                  {activeReview.id}. {activeReview.stem}
                </h2>
                <dl>
                  <div>
                    <dt>本人答案</dt>
                    <dd>{activeReview.mine}</dd>
                  </div>
                  <div>
                    <dt>标准答案</dt>
                    <dd>{activeReview.correct}</dd>
                  </div>
                  <div>
                    <dt>解析</dt>
                    <dd>{activeReview.analysis}</dd>
                  </div>
                </dl>
              </article>
            </div>
          </section>
        ) : (
          <section className="exam-panel">
            <EmptyState
              icon="empty"
              title="当前不开放逐题复盘"
              description="本页仅展示已获准公开的汇总结果，未渲染题干、本人答案、逐题正误、标准答案或解析。"
            />
          </section>
        )}
      </main>
    </ExamFrame>
  );
}

export function ExamPrototype({
  page,
  scenario,
  navigateTo,
  setScenario,
}: SurfacePrototypeProps) {
  const props = { scenario, navigateTo, setScenario };
  if (page.id === "EX-01") return <LoginPage {...props} />;
  if (page.id === "EX-02") return <TaskListPage {...props} />;
  if (page.id === "EX-03") return <QualificationPage {...props} />;
  if (page.id === "EX-04") return <WorkbenchPage {...props} />;
  if (page.id === "EX-05") return <ResultPage {...props} />;
  return (
    <EmptyState
      icon="error"
      title="页面不存在"
      description="请从考试任务列表重新进入。"
    />
  );
}
