import { useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BatteryMedium,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCopy,
  ClipboardList,
  Clock3,
  Home,
  KeyRound,
  ListChecks,
  LogOut,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Signal,
  Smartphone,
  Target,
  Timer,
  UserRound,
  Wifi,
  X,
} from 'lucide-react';
import { Badge, Banner, Button, EmptyState, ListLink, ProgressBar, Segmented } from '../components/ui';
import type { MiniPageId, PageId, PrototypePage, SurfacePrototypeProps, Tone } from '../types';
import './MiniPrototype.css';

const scenario = (id: string, label: string, description: string, tone: Tone = 'neutral') => ({ id, label, description, tone });

export const miniPages: PrototypePage[] = [
  {
    id: 'MP-01', surface: 'mini', title: '身份激活与绑定', description: '员工首登改密、短信验证、绑定与账号恢复',
    scenarios: [
      scenario('standard', '账号登录', '使用工号和临时密码登录'),
      scenario('first-login', '首次修改密码', '临时密码核验后强制修改密码', 'warning'),
      scenario('sms', '短信验证', '验证档案中的唯一手机号', 'info'),
      scenario('binding', '确认绑定', '确认员工身份和当前微信', 'info'),
      scenario('recovery', '账号恢复', '通过短信验证重置密码'),
      scenario('locked', '账号不可用', '账号锁定、停用或绑定冲突', 'danger'),
    ],
    fr: ['FR-AUTH-01', 'FR-AUTH-02', 'FR-AUTH-03', 'FR-AUTH-06'], flows: ['FL-AUTH', 'E2E-01'],
    acceptance: ['MP-01-AC-01', 'MP-01-AC-02', 'MP-01-AC-03', 'MP-01-AC-04', 'MP-01-AC-05'],
  },
  {
    id: 'MP-02', surface: 'mini', title: '首页', description: '正式考试待办、学习恢复入口与个人摘要',
    scenarios: [scenario('standard', '标准首页', '存在正式考试任务和学习数据'), scenario('resumable', '双会话可恢复', '练习和模拟均有进行中会话', 'warning'), scenario('empty', '暂无任务', '无任务且无学习记录'), scenario('partial', '部分加载失败', '任务状态刷新失败但学习模块可用', 'danger')],
    fr: ['FR-AUTH-06', 'FR-PRA-02', 'FR-SIM-01', 'FR-EXM-05'], flows: ['FL-PRA', 'FL-SIM', 'FL-ATT'],
    acceptance: ['MP-02-AC-01', 'MP-02-AC-02', 'MP-02-AC-03', 'MP-02-AC-04'],
  },
  {
    id: 'MP-03', surface: 'mini', title: '练习中心与配置', description: '顺序、随机、专项练习配置与会话恢复',
    scenarios: [scenario('standard', '顺序练习', '延续题库长期顺序进度'), scenario('random', '随机练习', '按 10、20、50 题随机抽取'), scenario('special', '专项练习', '按分类与知识点练习'), scenario('recover', '会话恢复', '已有一场可恢复练习', 'warning'), scenario('insufficient', '题量不足', '候选题不足或题库关闭', 'danger')],
    fr: ['FR-PRA-01', 'FR-PRA-02', 'FR-PRA-03'], flows: ['FL-PRA', 'E2E-03'],
    acceptance: ['MP-03-AC-01', 'MP-03-AC-02', 'MP-03-AC-03', 'MP-03-AC-04', 'MP-03-AC-05'],
  },
  {
    id: 'MP-04', surface: 'mini', title: '练习答题', description: '逐题提交、即时判定、错题更新与恢复',
    scenarios: [scenario('standard', '选择答案', '题目待提交'), scenario('correct', '回答正确', '确认后展示答案和解析', 'success'), scenario('incorrect', '回答错误', '确认后进入错题待练', 'danger'), scenario('save-error', '提交失败', '不展示答案并允许重试', 'danger'), scenario('complete', '本轮完成', '展示本次练习摘要', 'success'), scenario('exit', '离开确认', '暂时离开或结束当前练习', 'warning')],
    fr: ['FR-PRA-02', 'FR-PRA-04', 'FR-PRA-05'], flows: ['FL-PRA', 'E2E-03'],
    acceptance: ['MP-04-AC-01', 'MP-04-AC-02', 'MP-04-AC-03', 'MP-04-AC-04', 'MP-04-AC-05'],
  },
  {
    id: 'MP-05', surface: 'mini', title: '错题本', description: '待练错题筛选、复练和历史保留',
    scenarios: [scenario('standard', '50题内', '允许选择全部待练错题'), scenario('large', '超过50题', '仅允许 10、20、50 题'), scenario('empty', '暂无待练错题', '错题待练已清空', 'success'), scenario('disabled', '仅历史错题', '题目停用但历史仍保留', 'warning'), scenario('conflict', '练习冲突', '已有进行中练习', 'warning')],
    fr: ['FR-PRA-01', 'FR-PRA-02', 'FR-PRA-03', 'FR-PRA-04', 'FR-PRA-05'], flows: ['FL-PRA', 'E2E-03'],
    acceptance: ['MP-05-AC-01', 'MP-05-AC-02', 'MP-05-AC-03', 'MP-05-AC-04'],
  },
  {
    id: 'MP-06', surface: 'mini', title: '模拟配置', description: '员工自助模拟的题库、题量和时长配置',
    scenarios: [scenario('standard', '新建模拟', '配置新的模拟考试'), scenario('ongoing', '模拟进行中', '继续或二次确认放弃', 'warning'), scenario('abandon', '放弃确认', '放弃后不评分且不可恢复', 'danger'), scenario('insufficient', '不可开始', '题量不足或题库已关闭', 'danger')],
    fr: ['FR-SIM-01', 'FR-SIM-04'], flows: ['FL-SIM', 'E2E-04'],
    acceptance: ['MP-06-AC-01', 'MP-06-AC-02', 'MP-06-AC-03', 'MP-06-AC-04'],
  },
  {
    id: 'MP-07', surface: 'mini', title: '模拟答题', description: '固定试卷、逐题保存、服务端计时与终结',
    scenarios: [scenario('standard', '答题与保存', '答案实时保存'), scenario('offline', '离线待恢复', '保留本地选择并等待服务端确认', 'danger'), scenario('submit', '交卷确认', '提示未答题数', 'warning'), scenario('abandon', '放弃确认', '放弃后不评分', 'danger'), scenario('auto-submit', '自动交卷', '到期后页面只读', 'warning'), scenario('processing', '结果处理中', '幂等评分重试', 'info')],
    fr: ['FR-SIM-02', 'FR-SIM-03', 'FR-SIM-04', 'FR-SCR-01'], flows: ['FL-SIM', 'E2E-04'],
    acceptance: ['MP-07-AC-01', 'MP-07-AC-02', 'MP-07-AC-03', 'MP-07-AC-04', 'MP-07-AC-05'],
  },
  {
    id: 'MP-08', surface: 'mini', title: '模拟结果', description: '统一评分摘要与固定题目版本复盘',
    scenarios: [scenario('standard', '完整结果', '摘要、筛选和逐题解析'), scenario('processing', '结果生成中', '不展示临时分数', 'info'), scenario('failed', '加载失败', '保留结构并重新加载', 'danger')],
    fr: ['FR-SIM-03', 'FR-SCR-01'], flows: ['FL-SIM', 'E2E-04'],
    acceptance: ['MP-08-AC-01', 'MP-08-AC-02', 'MP-08-AC-03', 'MP-08-AC-04'],
  },
  {
    id: 'MP-09', surface: 'mini', title: '正式考试任务', description: '本人正式任务、过程状态和结果入口',
    scenarios: [scenario('standard', '任务列表', '展示多个生命周期与参与状态'), scenario('empty', '暂无任务', '无考试码输入入口'), scenario('closing', '收尾中', '停止新开卷后的整场观察', 'warning'), scenario('paused', '平台暂停', '等待恢复和统一补时', 'warning'), scenario('locked', '异常处理中', '结果锁定且不披露结果', 'danger'), scenario('cancelled', '考试已取消', '展示员工可见取消说明', 'danger')],
    fr: ['FR-EXM-04', 'FR-EXM-05'], flows: ['FL-ATT', 'FL-VIS', 'E2E-06'],
    acceptance: ['MP-09-AC-01', 'MP-09-AC-02', 'MP-09-AC-03', 'MP-09-AC-04', 'MP-09-AC-05', 'MP-09-AC-06'],
  },
  {
    id: 'MP-10', surface: 'mini', title: '正式考试任务详情', description: '考试说明、电脑端定位信息和受控结果入口',
    scenarios: [scenario('standard', '开放开卷', '可复制电脑端地址和考试码'), scenario('upcoming', '尚未开始', '展示开放时间'), scenario('continuing', '考试进行中', '提示到电脑端恢复原考试', 'warning'), scenario('closing', '收尾观察', '等待服务端确认整场结束', 'warning'), scenario('paused', '平台暂停', '不承诺当前可开卷', 'warning'), scenario('pending', '结果待公布', '不返回正式结果字段', 'info'), scenario('locked', '结果锁定', '异常处理中', 'danger'), scenario('cancelled', '考试取消', '隐藏电脑端定位信息', 'danger')],
    fr: ['FR-EXM-04', 'FR-EXM-05'], flows: ['FL-ATT', 'FL-VIS', 'E2E-06'],
    acceptance: ['MP-10-AC-01', 'MP-10-AC-02', 'MP-10-AC-03', 'MP-10-AC-04', 'MP-10-AC-05', 'MP-10-AC-06', 'MP-10-AC-07', 'MP-10-AC-08', 'MP-10-AC-09'],
  },
  {
    id: 'MP-11', surface: 'mini', title: '学习记录', description: '练习、模拟和正式考试个人记录与受控披露',
    scenarios: [scenario('standard', '练习记录', '练习列表与详情入口'), scenario('mock-completed', '模拟已完成', '显示成绩与复盘入口', 'success'), scenario('mock-abandoned', '模拟已放弃', '无评分和复盘入口', 'warning'), scenario('formal-pending', '正式结果待公布', '仅展示提交事实', 'info'), scenario('formal-summary', '正式汇总公开', '只展示允许的汇总项', 'success'), scenario('formal-review', '正式逐题开放', '满足公开下限后展示', 'success'), scenario('formal-locked', '结果异常锁定', '隐藏此前公开内容', 'danger'), scenario('invalidated', '尝试作废重算', '保留原行并更新官方结果', 'warning'), scenario('cancelled', '正式考试取消', '结果无官方效力', 'danger')],
    fr: ['FR-PRA-05', 'FR-SIM-03', 'FR-SIM-04', 'FR-EXM-05', 'FR-SCR-02', 'FR-SCR-03', 'FR-SCR-04'], flows: ['FL-PRA', 'FL-SIM', 'FL-VIS', 'E2E-07', 'E2E-08'],
    acceptance: ['MP-11-AC-01', 'MP-11-AC-02', 'MP-11-AC-03', 'MP-11-AC-04', 'MP-11-AC-05', 'MP-11-AC-06', 'MP-11-AC-07', 'MP-11-AC-08', 'MP-11-AC-09'],
  },
  {
    id: 'MP-12', surface: 'mini', title: '账号安全', description: '账号摘要、密码、绑定与会话操作',
    scenarios: [scenario('standard', '账号摘要', '查看本人档案与安全入口'), scenario('password', '修改密码', '验证当前密码并设置新密码'), scenario('unbind', '解除绑定', '短信验证与二次确认', 'warning'), scenario('error', '操作失败', '账号停用或结果不确定', 'danger')],
    fr: ['FR-AUTH-01', 'FR-AUTH-03', 'FR-AUTH-06'], flows: ['FL-AUTH'],
    acceptance: ['MP-12-AC-01', 'MP-12-AC-02', 'MP-12-AC-03', 'MP-12-AC-04'],
  },
];

type ScreenProps = Pick<SurfacePrototypeProps, 'scenario' | 'navigateTo' | 'setScenario'>;
type TabKey = 'home' | 'learn' | 'exam' | 'me';

const tabItems: { key: TabKey; label: string; page: MiniPageId; icon: typeof Home }[] = [
  { key: 'home', label: '首页', page: 'MP-02', icon: Home },
  { key: 'learn', label: '学习', page: 'MP-03', icon: BookOpenCheck },
  { key: 'exam', label: '考试', page: 'MP-09', icon: ClipboardList },
  { key: 'me', label: '我的', page: 'MP-11', icon: UserRound },
];

function PhoneShell({ title, activeTab, onBack, immersive = false, children, navigateTo }: { title?: string; activeTab?: TabKey; onBack?: () => void; immersive?: boolean; children: ReactNode; navigateTo: (page: PageId, scenario?: string) => void }) {
  return (
    <div className={`mini-device ${immersive ? 'mini-device--immersive' : ''}`}>
      <div className="mini-statusbar"><span>9:41</span><span><Signal size={14} /><Wifi size={14} /><BatteryMedium size={17} /></span></div>
      {title && <header className="mini-appbar">{onBack ? <button aria-label="返回" onClick={onBack}><ArrowLeft size={20} /></button> : <span className="mini-appbar__spacer" />}<strong>{title}</strong><button aria-label="更多"><MoreHorizontal size={20} /></button></header>}
      <div className="mini-viewport">{children}</div>
      {activeTab && <nav className="mini-tabbar" aria-label="小程序底部导航">{tabItems.map((item) => { const Icon = item.icon; return <button key={item.key} className={activeTab === item.key ? 'is-active' : ''} onClick={() => navigateTo(item.page)}><Icon size={20} /><span>{item.label}</span></button>; })}</nav>}
    </div>
  );
}

function PageIntro({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <div className="mini-page-intro"><div><span>{eyebrow}</span><h1>{title}</h1></div>{action}</div>;
}

function FlatSection({ title, meta, action, children, className = '' }: { title?: string; meta?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`mini-section ${className}`}>{(title || action) && <div className="mini-section__head"><div>{title && <h2>{title}</h2>}{meta && <p>{meta}</p>}</div>{action}</div>}{children}</section>;
}

function Field({ label, placeholder, type = 'text', value, onChange }: { label: string; placeholder?: string; type?: string; value?: string; onChange?: (value: string) => void }) {
  return <label className="mini-field"><span>{label}</span><input type={type} placeholder={placeholder} {...(onChange ? { value: value ?? '', onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value) } : { defaultValue: value })} /></label>;
}

function SelectField({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return <label className="mini-field"><span>{label}</span><select defaultValue={value}>{children ?? <option>{value}</option>}</select></label>;
}

function ActionRow({ children }: { children: ReactNode }) { return <div className="mini-actions">{children}</div>; }

function MetaRows({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className="mini-meta-rows">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function OptionButton({ label, text, selected, correct, wrong, disabled, onClick }: { label: string; text: string; selected?: boolean; correct?: boolean; wrong?: boolean; disabled?: boolean; onClick?: () => void }) {
  return <button className={`mini-option ${selected ? 'is-selected' : ''} ${correct ? 'is-correct' : ''} ${wrong ? 'is-wrong' : ''}`} disabled={disabled} onClick={onClick}><span>{label}</span><strong>{text}</strong>{correct && <Check size={17} />}{wrong && <X size={17} />}</button>;
}

function StatusLine({ icon, title, text, tone = 'neutral' }: { icon: ReactNode; title: string; text: string; tone?: Tone }) {
  return <div className={`mini-status-line mini-status-line--${tone}`}><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div>;
}

function getPasswordPolicy(password: string) {
  const classCount = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  const lengthValid = password.length >= 8 && password.length <= 64;
  return { classCount, lengthValid, valid: lengthValid && classCount >= 3 };
}

function PasswordRuleList({ password, confirmation }: { password: string; confirmation: string }) {
  const policy = getPasswordPolicy(password);
  const matches = confirmation.length > 0 && password === confirmation;
  return <ul className="mini-rule-list"><li className={policy.lengthValid ? 'is-pass' : ''}>{policy.lengthValid ? <Check size={14} /> : <AlertCircle size={14} />}长度 8-64 位</li><li className={policy.classCount >= 3 ? 'is-pass' : ''}>{policy.classCount >= 3 ? <Check size={14} /> : <AlertCircle size={14} />}大写、小写、数字、特殊字符四类中至少三类</li><li className={matches ? 'is-pass' : ''}>{matches ? <Check size={14} /> : <AlertCircle size={14} />}{confirmation && !matches ? '两次输入不一致' : '两次输入一致'}</li></ul>;
}

function AuthScreen({ scenario: active, navigateTo, setScenario }: ScreenProps) {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordValid = getPasswordPolicy(newPassword).valid && confirmPassword.length > 0 && newPassword === confirmPassword;
  const recoveryValid = codeSent && code.length === 6 && passwordValid;
  const steps = ['账号核验', '短信验证', '确认绑定'];
  const activeStep = active === 'standard' || active === 'first-login' || active === 'recovery' ? 0 : active === 'sms' ? 1 : 2;
  return <PhoneShell navigateTo={navigateTo}>
    <div className="mini-auth-head"><span className="mini-brand-mark"><ShieldCheck size={25} /></span><div><span>企业学习中心</span><h1>{active === 'recovery' ? '找回账号' : '员工身份激活'}</h1></div></div>
    <div className="mini-stepper">{steps.map((item, index) => <div className={index <= activeStep ? 'is-active' : ''} key={item}><span>{index < activeStep ? <Check size={13} /> : index + 1}</span><small>{item}</small></div>)}</div>
    <div className="mini-auth-body">
      {active === 'standard' && <><PageIntro eyebrow="统一账号" title="使用企业凭据登录" /><Field label="工号" placeholder="请输入员工工号" value="A02418" /><Field label="临时密码或密码" type="password" placeholder="请输入密码" /><ActionRow><Button onClick={() => setScenario('first-login')}>登录并继续</Button><Button variant="ghost" onClick={() => setScenario('recovery')}>忘记密码</Button></ActionRow><p className="mini-help"><CircleHelp size={15} />账号由企业管理员创建，手机号或工号有误请联系管理员。</p></>}
      {active === 'first-login' && <><PageIntro eyebrow="首次登录" title="设置新的登录密码" /><Banner title="临时密码必须更换" tone="warning">修改成功后再进行手机号验证。</Banner><Field label="新密码" type="password" placeholder="8-64 位，四类字符至少三类" value={newPassword} onChange={setNewPassword} /><Field label="确认新密码" type="password" placeholder="请再次输入" value={confirmPassword} onChange={setConfirmPassword} /><PasswordRuleList password={newPassword} confirmation={confirmPassword} /><Button className="mini-full-button" disabled={!passwordValid} onClick={() => setScenario('sms')}>保存并验证手机</Button></>}
      {active === 'sms' && <><PageIntro eyebrow="本人验证" title="验证档案手机号" /><p className="mini-copy">验证码将发送至企业档案手机号 <strong>138****9062</strong></p><div className="mini-code-row"><Field label="短信验证码" placeholder="6 位验证码" value={code} onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} /><Button variant="secondary" onClick={() => setCodeSent(true)}>{codeSent ? '已发送' : '发送验证码'}</Button></div><p className="mini-field-note">验证码 5 分钟内有效，60 秒后可重新发送。</p><Button className="mini-full-button" disabled={!codeSent || code.length !== 6} onClick={() => setScenario('binding')}>验证并继续</Button></>}
      {active === 'binding' && <><PageIntro eyebrow="最后一步" title="确认绑定当前微信" /><div className="mini-identity"><span><UserRound size={22} /></span><div><strong>陈晓雨</strong><p>工号 A02418 · 产品中心 / 产品设计部</p></div></div><MetaRows rows={[["手机号", '138****9062'], ['绑定对象', '当前微信账号'], ['绑定关系', '一名员工仅绑定一个微信']]} /><Banner title="请核对身份" tone="info">绑定后只能访问本人的任务、试卷与记录。</Banner><Button className="mini-full-button" onClick={() => navigateTo('MP-02')}>确认绑定并进入</Button></>}
      {active === 'recovery' && <><PageIntro eyebrow="账号恢复" title="短信验证并重置密码" /><Field label="工号" value="A02418" /><p className="mini-copy">验证码发送至档案手机号 <strong>138****9062</strong></p><div className="mini-code-row"><Field label="短信验证码" placeholder="6 位验证码" value={code} onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} /><Button variant="secondary" onClick={() => { setCodeSent(true); setCode(''); }}>{codeSent ? '重新发送' : '发送验证码'}</Button></div><p className="mini-field-note">{codeSent ? '验证码已发送，请输入 6 位数字验证码。' : '请先发送验证码。'}</p><Field label="新密码" type="password" placeholder="8-64 位，四类字符至少三类" value={newPassword} onChange={setNewPassword} /><Field label="确认新密码" type="password" placeholder="请再次输入" value={confirmPassword} onChange={setConfirmPassword} /><PasswordRuleList password={newPassword} confirmation={confirmPassword} /><Button className="mini-full-button" disabled={!recoveryValid} onClick={() => setScenario('standard')}>确认重置</Button></>}
      {active === 'locked' && <EmptyState icon="error" title="账号暂时不可用" description="账号已停用或绑定关系存在冲突。现有会话已结束，业务数据不会被删除。" action={<><Button onClick={() => setScenario('standard')}>重新登录</Button><Button variant="ghost">联系管理员</Button></>} />}
    </div>
  </PhoneShell>;
}

function HomeScreen({ scenario: active, navigateTo }: ScreenProps) {
  if (active === 'empty') return <PhoneShell title="企业学习" activeTab="home" navigateTo={navigateTo}><div className="mini-content"><PageIntro eyebrow="你好，陈晓雨" title="今天也保持进步" /><EmptyState title="暂无学习任务" description="当前没有正式考试或进行中的学习记录。" action={<Button onClick={() => navigateTo('MP-03')}>开始练习</Button>} /></div></PhoneShell>;
  return <PhoneShell title="企业学习" activeTab="home" navigateTo={navigateTo}><div className="mini-content"><PageIntro eyebrow="8月11日 · 企业时区 UTC+12" title="你好，陈晓雨" action={<button className="mini-avatar" onClick={() => navigateTo('MP-12')}><UserRound size={20} /></button>} />
    {active === 'partial' && <Banner title="考试任务状态可能已变化" tone="danger" action={<button className="mini-inline-action"><RefreshCw size={14} />重试</button>}>保留上次成功内容，参加资格请以刷新结果为准。</Banner>}
    <FlatSection className="mini-section--accent" title="信息安全年度考试" meta="正式考试 · 优先任务" action={<Badge tone="warning">开放中</Badge>}><MetaRows rows={[["停止新开卷", '2026-08-12 18:00'], ['单次时长', '60 分钟'], ['机会', '0 / 2 次']]} /><Button className="mini-full-button" onClick={() => navigateTo('MP-10')}>查看考试详情<ChevronRight size={16} /></Button></FlatSection>
    {active === 'resumable' && <><StatusLine icon={<BookOpenCheck size={18} />} title="顺序练习可继续" text="信息安全题库 · 已完成 18 / 50" tone="info" /><StatusLine icon={<Timer size={18} />} title="模拟考试进行中" text="剩余 41:26 · 已答 12 / 20" tone="warning" /></>}
    <FlatSection title="学习入口"><div className="mini-quick-grid"><button onClick={() => navigateTo('MP-03')}><span><BookOpenCheck size={20} /></span><strong>日常练习</strong><small>顺序 · 随机 · 专项</small></button><button onClick={() => navigateTo('MP-05')}><span><RotateCcw size={20} /></span><strong>错题复练</strong><small>待练 16 题</small></button><button onClick={() => navigateTo('MP-06')}><span><Timer size={20} /></span><strong>模拟考试</strong><small>限时自测</small></button><button onClick={() => navigateTo('MP-11')}><span><ListChecks size={20} /></span><strong>学习记录</strong><small>本月 12 次</small></button></div></FlatSection>
    <FlatSection title="本周学习"><div className="mini-metrics"><div><strong>126</strong><span>已练题目</span></div><div><strong>84%</strong><span>练习正确率</span></div><div><strong>3</strong><span>模拟次数</span></div></div></FlatSection>
  </div></PhoneShell>;
}

function PracticeConfigScreen({ scenario: active, navigateTo, setScenario }: ScreenProps) {
  const mode = ['standard', 'random', 'special'].includes(active) ? active as 'standard' | 'random' | 'special' : 'standard';
  return <PhoneShell title="练习中心" activeTab="learn" navigateTo={navigateTo}><div className="mini-content">
    <PageIntro eyebrow="日常练习" title="选择练习方式" action={<button className="mini-text-button" onClick={() => navigateTo('MP-05')}>错题本</button>} />
    {active === 'recover' && <><Banner title="有一场练习可继续" tone="warning">顺序练习 · 已提交 18 / 50 题</Banner><ActionRow><Button onClick={() => navigateTo('MP-04')}>继续练习</Button><Button variant="secondary" onClick={() => setScenario('standard')}>结束并新建</Button></ActionRow></>}
    <Segmented value={mode} options={[{ value: 'standard', label: '顺序' }, { value: 'random', label: '随机' }, { value: 'special', label: '专项' }]} onChange={setScenario} label="练习方式" />
    <FlatSection title="练习范围"><SelectField label="题库" value="信息安全题库"><option>信息安全题库</option><option>企业制度题库</option></SelectField>
      {mode === 'standard' && <><MetaRows rows={[["长期进度", '126 / 480'], ['本轮起点', '第 127 题'], ['本轮题量', '50 题']]} /><ProgressBar value={26} label="顺序练习进度" /></>}
      {mode === 'random' && <QuantityPicker />}
      {mode === 'special' && <><SelectField label="分类" value="网络安全"><option>网络安全</option><option>数据安全</option><option>密码安全</option></SelectField><SelectField label="知识点" value="钓鱼邮件"><option>钓鱼邮件</option><option>公共 WiFi</option><option>VPN</option></SelectField><QuantityPicker /></>}
    </FlatSection>
    {active === 'insufficient' && <Banner title="当前范围题量不足" tone="danger">所选知识点只有 7 道启用题目，请调整范围或题量。</Banner>}
    <Button className="mini-full-button" disabled={active === 'insufficient'} onClick={() => navigateTo('MP-04')}>开始练习</Button>
    <ListLink title="模拟考试" meta="限时答题，交卷后统一评分" onClick={() => navigateTo('MP-06')} />
  </div></PhoneShell>;
}

function QuantityPicker({ allowAll = false }: { allowAll?: boolean }) {
  const [quantity, setQuantity] = useState('20');
  return <div className="mini-picker"><span>题量</span><div>{['10', '20', '50', ...(allowAll ? ['全部'] : [])].map((item) => <button className={quantity === item ? 'is-active' : ''} key={item} onClick={() => setQuantity(item)}>{item}{item !== '全部' && '题'}</button>)}</div></div>;
}

function PracticeAnswerScreen({ scenario: active, navigateTo, setScenario }: ScreenProps) {
  const [questionNumber, setQuestionNumber] = useState(18);
  const [answer, setAnswer] = useState('');
  if (active === 'complete') return <PhoneShell title="练习完成" immersive navigateTo={navigateTo} onBack={() => navigateTo('MP-03')}><div className="mini-content mini-result"><span className="mini-result-icon"><CheckCircle2 size={36} /></span><h1>本轮练习已完成</h1><p>本次只统计已提交的题目</p><div className="mini-score-grid"><div><strong>42</strong><span>正确</span></div><div><strong>8</strong><span>错误</span></div><div><strong>84%</strong><span>正确率</span></div></div><ActionRow><Button onClick={() => navigateTo('MP-05')}>练习错题</Button><Button variant="secondary" onClick={() => navigateTo('MP-11')}>查看记录</Button></ActionRow></div></PhoneShell>;
  const reviewed = active === 'correct' || active === 'incorrect';
  const nextQuestion = () => {
    if (questionNumber === 50) {
      setScenario('complete');
      return;
    }
    setQuestionNumber((current) => current + 1);
    setAnswer('');
    setScenario('standard');
  };
  return <PhoneShell title="顺序练习" immersive navigateTo={navigateTo} onBack={() => setScenario('exit')}><div className="mini-answer-layout"><div className="mini-answer-top"><span>第 {questionNumber} / 50 题</span><strong>单选题</strong></div><ProgressBar value={(questionNumber / 50) * 100} label="练习进度" /><div className="mini-question"><p>员工收到疑似钓鱼邮件时，以下哪项处理最恰当？</p></div><div className="mini-options"><OptionButton label="A" text="立即点击链接确认账户" selected={answer === 'A'} wrong={active === 'incorrect' && answer === 'A'} disabled={reviewed} onClick={() => setAnswer('A')} /><OptionButton label="B" text="转发给同事询问是否可信" selected={answer === 'B'} disabled={reviewed} onClick={() => setAnswer('B')} /><OptionButton label="C" text="通过企业安全渠道报告并删除邮件" selected={answer === 'C'} correct={reviewed} disabled={reviewed} onClick={() => setAnswer('C')} /><OptionButton label="D" text="回复发件人索要身份证明" selected={answer === 'D'} disabled={reviewed} onClick={() => setAnswer('D')} /></div>
    {active === 'save-error' && <Banner title="答案提交失败" tone="danger">尚未确认保存，不展示正确答案。请检查网络后重试。</Banner>}
    {reviewed && <div className={`mini-feedback ${active === 'correct' ? 'is-correct' : 'is-wrong'}`}><strong>{active === 'correct' ? '回答正确' : '回答错误，已加入错题待练'}</strong><p>正确答案：C</p><p>解析：不要点击或转发可疑内容，应通过企业指定安全渠道报告。</p></div>}
    <div className="mini-answer-actions">{reviewed ? <Button onClick={nextQuestion}>{questionNumber === 50 ? '完成练习' : '下一题'}<ChevronRight size={16} /></Button> : <Button disabled={!answer && active !== 'save-error'} onClick={() => setScenario(answer === 'C' ? 'correct' : 'incorrect')}>{active === 'save-error' ? '重试提交' : '提交答案'}</Button>}</div></div>
    {active === 'exit' && <div className="mini-sheet"><div><span className="mini-sheet__handle" /><h2>离开当前练习？</h2><p>暂时离开会保留固定题目和已提交进度；结束练习后本轮不可继续。</p><Button className="mini-full-button" onClick={() => navigateTo('MP-03', 'recover')}>暂时离开</Button><Button className="mini-full-button" variant="danger" onClick={() => navigateTo('MP-11')}>结束当前练习</Button><Button className="mini-full-button" variant="ghost" onClick={() => setScenario('standard')}>继续答题</Button></div></div>}
  </PhoneShell>;
}

function WrongBookScreen({ scenario: active, navigateTo, setScenario }: ScreenProps) {
  if (active === 'empty') return <PhoneShell title="错题本" navigateTo={navigateTo} onBack={() => navigateTo('MP-03')}><div className="mini-content"><EmptyState title="待练错题已清空" description="错题答对一次后会移出待练，历史记录仍然保留。" action={<Button onClick={() => navigateTo('MP-03')}>返回练习中心</Button>} /></div></PhoneShell>;
  return <PhoneShell title="错题本" navigateTo={navigateTo} onBack={() => navigateTo('MP-03')}><div className="mini-content"><PageIntro eyebrow="日常练习错题" title={active === 'disabled' ? '历史错题' : '待练 36 题'} action={<Badge tone={active === 'disabled' ? 'warning' : 'danger'}>{active === 'disabled' ? '不可复练' : '需巩固'}</Badge>} />
    {active === 'conflict' && <Banner title="已有进行中练习" tone="warning" action={<button className="mini-inline-action" onClick={() => navigateTo('MP-04')}>继续</button>}>结束当前练习后才能创建错题练习。</Banner>}
    <div className="mini-filter-row"><button className="is-active">全部分类</button><button>网络安全</button><button>数据安全</button></div>
    {active === 'disabled' && <Banner title="这些题目当前已停用" tone="warning">历史仍可查看，但不会进入新的练习试卷。</Banner>}
    <FlatSection title="选择题量" meta={active === 'large' ? '共 86 题，最多选择 50 题' : '50 题内可全部练习'}><QuantityPicker allowAll={active !== 'large'} /></FlatSection>
    <div className="mini-question-list">{['公共 WiFi 使用规范', '敏感数据传输要求', '多因素认证的作用'].map((item, index) => <button key={item}><span>{index + 1}</span><div><strong>{item}</strong><small>信息安全题库 · {index === 1 ? '数据安全' : '网络安全'}</small></div><ChevronRight size={17} /></button>)}</div>
    <Button className="mini-full-button" disabled={active === 'disabled' || active === 'conflict'} onClick={() => navigateTo('MP-04')}>开始错题练习</Button><Button className="mini-full-button" variant="ghost" onClick={() => setScenario('empty')}>查看已清空状态</Button>
  </div></PhoneShell>;
}

function MockConfigScreen({ scenario: active, navigateTo, setScenario }: ScreenProps) {
  return <PhoneShell title="模拟考试" navigateTo={navigateTo} onBack={() => navigateTo('MP-03')}><div className="mini-content"><PageIntro eyebrow="自助检测" title="配置一场模拟考试" />
    {(active === 'ongoing' || active === 'abandon') && <StatusLine icon={<Timer size={19} />} title="一场模拟正在进行" text="信息安全题库 · 剩余 41:26 · 已答 12 / 20" tone="warning" />}
    {active === 'ongoing' && <ActionRow><Button onClick={() => navigateTo('MP-07')}>继续模拟</Button><Button variant="secondary" onClick={() => setScenario('abandon')}>放弃本场</Button></ActionRow>}
    <FlatSection title="模拟配置"><SelectField label="题库" value="信息安全题库"><option>信息安全题库</option><option>企业制度题库</option></SelectField><QuantityPicker /><label className="mini-field"><span>考试时长（分钟）</span><input type="number" min="10" max="180" defaultValue="60" /></label></FlatSection>
    <Banner title="统一交卷后评分" tone="info">答题过程中不显示正确答案；题序随机后固定，选项顺序保持题库顺序。</Banner>
    {active === 'insufficient' && <Banner title="暂时无法开始" tone="danger">题库当前只有 8 道启用题目，少于所选题量。</Banner>}
    <Button className="mini-full-button" disabled={active === 'ongoing' || active === 'abandon' || active === 'insufficient'} onClick={() => navigateTo('MP-07')}>开始模拟考试</Button>
    {active === 'abandon' && <div className="mini-sheet"><div><span className="mini-sheet__handle" /><h2>确认放弃本场模拟？</h2><p>放弃后无法恢复，不生成分数，也不能查看题目答案和解析。</p><Button className="mini-full-button" variant="danger" onClick={() => navigateTo('MP-11', 'mock-abandoned')}>确认放弃</Button><Button className="mini-full-button" variant="secondary" onClick={() => setScenario('ongoing')}>继续答题</Button></div></div>}
  </div></PhoneShell>;
}

function MockAnswerScreen({ scenario: active, navigateTo, setScenario }: ScreenProps) {
  const [currentQuestion, setCurrentQuestion] = useState(12);
  const [answers, setAnswers] = useState<Record<number, string>>({ 12: 'A' });
  const [answerSheetVisible, setAnswerSheetVisible] = useState(false);
  const readonly = active === 'auto-submit' || active === 'processing';
  const answer = answers[currentQuestion] ?? '';
  const toggleAnswer = (option: string) => setAnswers((current) => {
    const selected = current[currentQuestion] ?? '';
    return { ...current, [currentQuestion]: selected.includes(option) ? selected.replace(option, '') : `${selected}${option}` };
  });
  const goToQuestion = (question: number) => {
    setCurrentQuestion(question);
    setAnswerSheetVisible(false);
  };
  return <PhoneShell title="模拟考试" immersive navigateTo={navigateTo} onBack={() => setScenario('abandon')}><div className="mini-answer-layout"><div className="mini-exam-clock"><span><Clock3 size={16} />剩余时间</span><strong>{readonly ? '00:00' : '41:26'}</strong></div><div className="mini-answer-top"><span>第 {currentQuestion} / 20 题</span><strong>多选题</strong></div><ProgressBar value={(currentQuestion / 20) * 100} label="模拟答题进度" /><div className="mini-question"><p>以下哪些做法有助于保护企业账号安全？</p></div><div className="mini-options"><OptionButton label="A" text="启用多因素认证" selected={answer.includes('A')} disabled={readonly} onClick={() => toggleAnswer('A')} /><OptionButton label="B" text="不同系统复用相同密码" selected={answer.includes('B')} disabled={readonly} onClick={() => toggleAnswer('B')} /><OptionButton label="C" text="定期检查异常登录" selected={answer.includes('C')} disabled={readonly} onClick={() => toggleAnswer('C')} /><OptionButton label="D" text="将验证码转告同事" selected={answer.includes('D')} disabled={readonly} onClick={() => toggleAnswer('D')} /></div>
    <div className={`mini-save-state ${active === 'offline' ? 'is-error' : ''}`}>{active === 'offline' ? <><AlertCircle size={14} />未确认保存 · 网络恢复后重试</> : <><Check size={14} />答案已保存 · 10:24:18</>}</div>
    {active === 'auto-submit' && <Banner title="时间已到，正在自动交卷" tone="warning">页面已只读，请勿重复操作。</Banner>}
    {active === 'processing' && <Banner title="结果处理中" tone="info">系统正在完成唯一评分结果，请稍候。</Banner>}
    <div className="mini-answer-nav"><Button variant="secondary" disabled={currentQuestion === 1} onClick={() => goToQuestion(currentQuestion - 1)}>上一题</Button><button className="mini-sheet-trigger" onClick={() => setAnswerSheetVisible(true)}><ListChecks size={18} />答题卡</button><Button variant="secondary" disabled={currentQuestion === 20} onClick={() => goToQuestion(currentQuestion + 1)}>下一题</Button></div><Button className="mini-full-button" disabled={readonly || active === 'offline'} onClick={() => setScenario('submit')}>提交试卷</Button></div>
    {active === 'submit' && <div className="mini-sheet"><div><span className="mini-sheet__handle" /><h2>确认提交试卷？</h2><p>还有 3 题未作答。提交后不能修改答案，将立即统一评分。</p><Button className="mini-full-button" onClick={() => navigateTo('MP-08', 'processing')}>确认交卷</Button><Button className="mini-full-button" variant="secondary" onClick={() => setScenario('standard')}>继续检查</Button></div></div>}
    {active === 'abandon' && <div className="mini-sheet"><div><span className="mini-sheet__handle" /><h2>放弃模拟考试？</h2><p>放弃后不评分、不生成模拟结果，也不能查看答案和解析。</p><Button className="mini-full-button" variant="danger" onClick={() => navigateTo('MP-11', 'mock-abandoned')}>确认放弃</Button><Button className="mini-full-button" variant="secondary" onClick={() => setScenario('standard')}>继续答题</Button></div></div>}
    {answerSheetVisible && <div className="mini-sheet"><div><span className="mini-sheet__handle" /><h2>答题卡</h2><p>已答 {Object.values(answers).filter(Boolean).length} / 20 题</p><div className="mini-answer-card-grid">{Array.from({ length: 20 }, (_, index) => index + 1).map((question) => <button key={question} className={`${question === currentQuestion ? 'is-current' : ''} ${answers[question] ? 'is-answered' : ''}`} onClick={() => goToQuestion(question)}>{question}{answers[question] && <Check size={12} />}</button>)}</div><Button className="mini-full-button" variant="secondary" onClick={() => setAnswerSheetVisible(false)}>关闭答题卡</Button></div></div>}
  </PhoneShell>;
}

function MockResultScreen({ scenario: active, navigateTo, setScenario }: ScreenProps) {
  const [filter, setFilter] = useState('全部');
  if (active === 'processing') return <PhoneShell title="模拟结果" navigateTo={navigateTo} onBack={() => navigateTo('MP-11')}><div className="mini-content"><EmptyState icon="loading" title="正在生成结果" description="系统正在完成统一评分，不展示临时分数。" action={<Button onClick={() => setScenario('standard')}>刷新结果</Button>} /></div></PhoneShell>;
  if (active === 'failed') return <PhoneShell title="模拟结果" navigateTo={navigateTo} onBack={() => navigateTo('MP-11')}><div className="mini-content"><EmptyState icon="error" title="结果加载失败" description="未使用缓存分数，请重新加载服务端结果。" action={<Button onClick={() => setScenario('standard')}>重新加载</Button>} /></div></PhoneShell>;
  return <PhoneShell title="模拟结果" navigateTo={navigateTo} onBack={() => navigateTo('MP-11')}><div className="mini-content mini-result"><span className="mini-result-icon"><Target size={34} /></span><p>信息安全题库 · 20 题</p><div className="mini-score"><strong>84</strong><span>/ 100 分</span></div><div className="mini-score-grid"><div><strong>16</strong><span>正确</span></div><div><strong>3</strong><span>错误</span></div><div><strong>1</strong><span>未答</span></div></div><MetaRows rows={[["有效用时", '36分18秒'], ['完成时间', '2026-08-11 10:42 (UTC+12)']]} />
    <div className="mini-filter-row">{['全部', '错误', '未答', '正确'].map((item) => <button key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
    <FlatSection title={`${filter}题目`} meta="使用本次固定题目版本"><div className="mini-review-item"><div><Badge tone="danger">回答错误</Badge><span>0 / 5 分</span></div><strong>公共 WiFi 环境下，以下做法最安全的是？</strong><p>你的答案：A<br />正确答案：C<br />解析：连接可信 VPN 后再访问企业系统。</p></div></FlatSection>
    <ActionRow><Button onClick={() => navigateTo('MP-06')}>再来一次</Button><Button variant="secondary" onClick={() => navigateTo('MP-11')}>全部记录</Button></ActionRow>
  </div></PhoneShell>;
}

const formalScenarioCopy: Record<string, { title: string; text: string; tone: Tone }> = {
  closing: { title: '收尾中', text: '已停止新开卷，正在确认整场结束状态。', tone: 'warning' },
  paused: { title: '平台暂停', text: '请等待恢复和统一补时，当前不展示最终结果。', tone: 'warning' },
  locked: { title: '异常处理中', text: '结果已锁定，请等待企业通知。', tone: 'danger' },
  cancelled: { title: '考试已取消', text: '因考试安排调整，本场结果不具有官方效力。', tone: 'danger' },
};

function formalState(active: string) {
  return {
    lifecycle: active === 'cancelled' ? '已取消' : active === 'closing' ? '收尾中' : active === 'locked' || active === 'pending' ? '已结束' : active === 'upcoming' ? '未开始' : '开放开卷',
    runtime: active === 'paused' ? '暂停中' : '正常',
    participation: active === 'continuing' ? '考试中' : ['closing', 'locked', 'pending'].includes(active) ? '已交卷' : '未参加',
  };
}

function FormalTasksScreen({ scenario: active, navigateTo }: ScreenProps) {
  if (active === 'empty') return <PhoneShell title="正式考试" activeTab="exam" navigateTo={navigateTo}><div className="mini-content"><EmptyState title="暂无考试任务" description="正式考试由企业统一分配，此处不支持输入考试码查找任务。" /></div></PhoneShell>;
  const state = formalScenarioCopy[active];
  const statuses = formalState(active);
  return <PhoneShell title="正式考试" activeTab="exam" navigateTo={navigateTo}><div className="mini-content"><PageIntro eyebrow="企业正式考核" title="我的考试任务" action={<button className="mini-refresh"><RefreshCw size={16} /></button>} />
    {state && <Banner title={state.title} tone={state.tone}>{state.text}</Banner>}
    {active === 'standard' && <div className="mini-filter-row"><button className="is-active">全部</button><button>待参加</button><button>考试中</button><button>已完成</button></div>}
    <div className="mini-task-list">
      <section className="mini-task"><div className="mini-task__head"><div><div className="mini-state-pair"><span>生命周期 <strong>{statuses.lifecycle}</strong></span><span>参与 <strong>{statuses.participation}</strong></span></div><h2>信息安全年度考试</h2></div><Badge tone={active === 'cancelled' ? 'danger' : active === 'locked' ? 'danger' : active === 'closing' ? 'warning' : 'success'}>{state?.title ?? '可参加'}</Badge></div><MetaRows rows={[["运行状态", statuses.runtime], ["开放开始", '2026-08-11 09:00'], ['停止新开卷', '2026-08-12 18:00'], ['考试时长', `60分钟 · ${['closing', 'locked', 'pending'].includes(active) ? '1' : '0'}/2次`]]} /><Button className="mini-full-button" onClick={() => navigateTo('MP-10', active === 'standard' ? 'standard' : active)}>查看详情</Button></section>
      {active === 'standard' && <section className="mini-task"><div className="mini-task__head"><div><div className="mini-state-pair"><span>生命周期 <strong>开放开卷</strong></span><span>参与 <strong>考试中</strong></span></div><h2>企业制度季度考试</h2></div><Badge tone="warning">电脑端继续</Badge></div><p className="mini-copy">已有一场在途尝试，请到电脑端恢复原考试。</p><Button className="mini-full-button" variant="secondary" onClick={() => navigateTo('MP-10', 'continuing')}>查看任务说明</Button></section>}
    </div><p className="mini-updated">最后更新 10:28:12 · 企业时区 UTC+12</p>
  </div></PhoneShell>;
}

function FormalDetailScreen({ scenario: active, navigateTo }: ScreenProps) {
  const [copied, setCopied] = useState('');
  const unavailable = active === 'cancelled' || active === 'locked';
  const state = formalScenarioCopy[active];
  const statuses = formalState(active);
  const banner = active === 'upcoming' ? { title: '尚未开放', text: '2026-08-12 09:00 后可到电脑端参加。', tone: 'info' as Tone } : active === 'continuing' ? { title: '考试进行中', text: '请在电脑端恢复原考试，试卷和剩余时间保持不变。', tone: 'warning' as Tone } : active === 'pending' ? { title: '结果待公布', text: '已记录提交事实，正式结果将在允许的时机公布。', tone: 'info' as Tone } : state;
  return <PhoneShell title="考试详情" navigateTo={navigateTo} onBack={() => navigateTo('MP-09')}><div className="mini-content"><PageIntro eyebrow="正式考试" title="信息安全年度考试" action={<Badge tone={banner?.tone ?? 'success'}>{banner?.title ?? '开放中'}</Badge>} />{banner && <Banner title={banner.title} tone={banner.tone}>{banner.text}</Banner>}
    <FlatSection title="考试说明"><p className="mini-copy">请使用受支持的桌面 Chrome 或 Edge 浏览器参加。考试期间请独立完成答题。</p></FlatSection>
    <FlatSection title="当前状态"><MetaRows rows={[["生命周期", statuses.lifecycle], ['运行状态', statuses.runtime], ['本人参与', statuses.participation]]} /></FlatSection>
    <FlatSection title="时间与规则"><MetaRows rows={[["开放开始", '2026-08-11 09:00'], ['停止新开卷', '2026-08-12 18:00'], ['单次时长', '60 分钟'], ['题量与总分', '50 题 · 100 分'], ['考试机会', ['continuing', 'closing', 'locked', 'pending'].includes(active) ? '1 / 2 次' : '0 / 2 次']]} /></FlatSection>
    {!unavailable && <FlatSection title="电脑端定位信息" meta="地址和考试码不能替代登录或应考资格"><div className="mini-copy-box"><span>考试地址</span><strong>exam.intra.example/secure</strong><button aria-label="复制考试地址" onClick={() => setCopied('地址')}><ClipboardCopy size={18} /></button></div><div className="mini-copy-box"><span>考试码</span><strong>IS2026</strong><button aria-label="复制考试码" onClick={() => setCopied('考试码')}><ClipboardCopy size={18} /></button></div>{copied && <p className="mini-copy-success"><Check size={14} />{copied}已复制</p>}<p className="mini-help"><Smartphone size={15} />小程序不打开正式考试页面，也不提供开始考试按钮。</p></FlatSection>}
    <FlatSection title="本人任务状态"><MetaRows rows={[["参与状态", active === 'cancelled' ? '考试已取消' : statuses.participation], ['当前操作', active === 'cancelled' ? '无需参加' : active === 'pending' || active === 'locked' ? '等待结果' : '请到电脑端操作']]} /></FlatSection>
    {['pending', 'locked', 'cancelled'].includes(active) && <Button className="mini-full-button" variant="secondary" onClick={() => navigateTo('MP-11', active === 'locked' ? 'formal-locked' : active === 'cancelled' ? 'cancelled' : 'formal-pending')}>{active === 'locked' ? '异常处理中' : active === 'pending' ? '结果待公布' : '查看取消记录'}</Button>}
  </div></PhoneShell>;
}

function RecordTabs({ active, onChange }: { active: string; onChange: (value: string) => void }) {
  return <div className="mini-record-tabs">{[['practice', '练习'], ['mock', '模拟'], ['formal', '正式考试']].map(([value, label]) => <button key={value} className={active === value ? 'is-active' : ''} onClick={() => onChange(value)}>{label}</button>)}</div>;
}

function RecordsScreen({ scenario: active, navigateTo, setScenario }: ScreenProps) {
  const tab = active === 'standard' ? 'practice' : active === 'mock-abandoned' || active === 'mock-completed' ? 'mock' : 'formal';
  const changeTab = (value: string) => { if (value === 'practice') setScenario('standard'); else if (value === 'mock') setScenario('mock-completed'); else setScenario('formal-pending'); };
  return <PhoneShell title="我的学习" activeTab="me" navigateTo={navigateTo}><div className="mini-content"><PageIntro eyebrow="陈晓雨 · A02418" title="学习记录" action={<button className="mini-avatar" onClick={() => navigateTo('MP-12')}><KeyRound size={19} /></button>} /><RecordTabs active={tab} onChange={changeTab} />
    {active === 'standard' && <><div className="mini-filter-row"><button className="is-active">全部状态</button><button>进行中</button><button>已完成</button></div><div className="mini-record-list"><ListLink title="信息安全题库 · 顺序练习" meta="进行中 · 已提交 18 / 50" onClick={() => navigateTo('MP-04')} trailing={<Badge tone="warning">继续</Badge>} /><ListLink title="网络安全 · 专项练习" meta="已完成 · 正确 17 / 20 · 8月10日" trailing={<Badge tone="success">85%</Badge>} /><ListLink title="信息安全题库 · 随机练习" meta="提前结束 · 已提交 8 / 10 · 8月8日" /></div></>}
    {active === 'mock-completed' && <FlatSection title="信息安全模拟考试" meta="8月11日 10:42 完成"><div className="mini-official-score"><div><span>模拟成绩</span><strong>84</strong><small>/ 100 分</small></div><Badge tone="success">已完成</Badge></div><MetaRows rows={[["题量", '20 题'], ['正确 / 错误 / 未答', '16 / 3 / 1'], ['有效用时', '36分18秒']]} /><Button className="mini-full-button" onClick={() => navigateTo('MP-08')}>查看模拟结果</Button></FlatSection>}
    {active === 'mock-abandoned' && <><Banner title="本场模拟已放弃" tone="warning">开始 10:02 · 放弃 10:18 · 已答 7 / 20</Banner><FlatSection title="信息安全模拟考试"><MetaRows rows={[["状态", '已放弃'], ['评分', '未评分'], ['逐题复盘', '不可查看']]} /><Button className="mini-full-button" onClick={() => navigateTo('MP-06')}>开始新模拟</Button></FlatSection></>}
    {active.startsWith('formal') || active === 'invalidated' || active === 'cancelled' ? <FormalRecord scenario={active} navigateTo={navigateTo} setScenario={setScenario} /> : null}
  </div></PhoneShell>;
}

function FormalRecord({ scenario: active, navigateTo }: ScreenProps) {
  const pending = active === 'formal-pending';
  const locked = active === 'formal-locked';
  const cancelled = active === 'cancelled';
  const invalidated = active === 'invalidated';
  const summary = active === 'formal-summary' || active === 'formal-review' || active === 'invalidated';
  return <div className="mini-formal-record"><div className="mini-record-title"><div><small>信息安全年度考试</small><h2>{cancelled ? '考试已取消' : locked ? '异常处理中' : pending ? '结果待公布' : '正式考试结果'}</h2></div><Badge tone={cancelled || locked ? 'danger' : pending ? 'info' : invalidated ? 'warning' : 'success'}>{cancelled ? '无官方效力' : locked ? '结果锁定' : pending ? '已交卷' : invalidated ? '已重算' : '已公开'}</Badge></div>
    {(pending || locked || cancelled) && <Banner title={locked ? '结果锁定，异常处理中' : cancelled ? '考试安排已取消' : '正式结果待公布'} tone={locked || cancelled ? 'danger' : 'info'}>{locked ? '只保留已提交事实，不返回此前汇总或逐题内容。' : cancelled ? '本场结果不具有官方效力。原因：考试安排调整。' : '已于 8月11日 10:26 提交，当前不展示分数或通过结论。'}</Banner>}
    {invalidated && <Banner title="尝试 #2 已作废" tone="warning">原得分 96 分不再计入官方结果；尝试 #1 的 72 分成为官方成绩。</Banner>}
    {summary && <><div className="mini-official-score"><div><span>官方成绩</span><strong>{invalidated ? '72' : '88'}</strong><small>/ 100 分</small></div><Badge tone={invalidated ? 'danger' : 'success'}>{invalidated ? '未通过' : '已通过'}</Badge></div><div className="mini-score-grid"><div><strong>{invalidated ? '36' : '44'}</strong><span>正确</span></div><div><strong>{invalidated ? '14' : '6'}</strong><span>错误</span></div><div><strong>{invalidated ? '51:40' : '52:16'}</strong><span>有效用时</span></div></div>{invalidated && <MetaRows rows={[["有效 / 总尝试", '1 / 2']]} />}</>}
    <FlatSection title="全部尝试" meta="按尝试序号排列，不按成绩排序"><div className="mini-attempt"><div><strong>第 1 次尝试</strong><Badge tone={summary ? 'success' : 'neutral'}>{summary ? '官方尝试' : '已提交'}</Badge></div><p>{invalidated ? '8月11日 09:04 · 51分40秒' : '8月11日 09:34 - 10:26 · 52分16秒'}</p>{summary && <strong>{invalidated ? '72 分' : '88 分'}</strong>}</div>{invalidated && <div className="mini-attempt"><div><strong>第 2 次尝试</strong><Badge tone="danger">已作废</Badge></div><p>8月11日 10:02 · 42分18秒</p><strong>原成绩 96 分 · 已返还一次机会</strong></div>}</FlatSection>
    {active === 'formal-summary' && <Banner title="逐题内容尚未开放" tone="info">当前仅公开管理员允许的汇总项。</Banner>}
    {active === 'formal-review' && <FlatSection title="逐题复盘" meta="整场已结束且已无剩余合法机会"><div className="mini-review-item"><div><Badge tone="danger">回答错误</Badge><span>0 / 2 分</span></div><strong>公共 WiFi 环境下访问企业系统，应优先采取什么措施？</strong><p>你的答案：A<br />正确答案：C<br />解析：使用可信 VPN 并确认网络安全后再访问。</p></div></FlatSection>}
    {!cancelled && !locked && <ActionRow><Button variant="secondary" onClick={() => navigateTo('MP-10')}>任务详情</Button></ActionRow>}
  </div>;
}

function AccountScreen({ scenario: active, navigateTo, setScenario }: ScreenProps) {
  const [codeSent, setCodeSent] = useState(false);
  const [unbindCode, setUnbindCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmUnbind, setConfirmUnbind] = useState(false);
  const newPasswordValid = getPasswordPolicy(newPassword).valid;
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canChangePassword = currentPassword.length > 0 && newPasswordValid && passwordsMatch;
  const canUnbind = codeSent && unbindCode.length === 6;
  return <PhoneShell title="账号安全" navigateTo={navigateTo} onBack={() => navigateTo('MP-11')}><div className="mini-content"><PageIntro eyebrow="企业统一账号" title="账号与安全" />
    {active === 'standard' && <><div className="mini-identity"><span><UserRound size={22} /></span><div><strong>陈晓雨</strong><p>工号 A02418 · 产品中心 / 产品设计部</p></div></div><MetaRows rows={[["档案手机号", '138****9062'], ['小程序绑定', <Badge tone="success">已绑定</Badge>], ['账号状态', <Badge tone="success">启用</Badge>]]} /><FlatSection title="安全操作"><ListLink title="修改登录密码" meta="修改后所有原会话失效" onClick={() => setScenario('password')} trailing={<KeyRound size={18} />} /><ListLink title="解除小程序绑定" meta="需要档案手机号验证" onClick={() => setScenario('unbind')} trailing={<Smartphone size={18} />} /><ListLink title="退出登录" meta="不会解除当前绑定" onClick={() => navigateTo('MP-01')} trailing={<LogOut size={18} />} /></FlatSection><p className="mini-help"><CircleHelp size={15} />姓名、部门或手机号有误，请联系企业管理员维护。</p></>}
    {active === 'password' && <><Banner title="修改后需重新登录" tone="warning">所有原会话失效，已保存的学习记录不会删除。</Banner><Field label="当前密码" type="password" placeholder="请输入当前密码" value={currentPassword} onChange={setCurrentPassword} /><Field label="新密码" type="password" placeholder="8-64 位，四类字符至少三类" value={newPassword} onChange={setNewPassword} /><Field label="确认新密码" type="password" placeholder="请再次输入" value={confirmPassword} onChange={setConfirmPassword} /><PasswordRuleList password={newPassword} confirmation={confirmPassword} /><Button className="mini-full-button" disabled={!canChangePassword} onClick={() => navigateTo('MP-01')}>确认修改</Button><Button className="mini-full-button" variant="ghost" onClick={() => setScenario('standard')}>取消</Button></>}
    {active === 'unbind' && <><Banner title="解除后需重新绑定" tone="warning">不会删除账号、密码或进行中的学习任务。</Banner><p className="mini-copy">验证码将发送至 <strong>138****9062</strong></p><div className="mini-code-row"><Field label="短信验证码" placeholder="6 位验证码" value={unbindCode} onChange={(value) => setUnbindCode(value.replace(/\D/g, '').slice(0, 6))} /><Button variant="secondary" onClick={() => { setCodeSent(true); setUnbindCode(''); setConfirmUnbind(false); }}>{codeSent ? '重新发送' : '发送验证码'}</Button></div><p className="mini-field-note">{codeSent ? '验证码已发送，请输入 6 位数字验证码。' : '请先发送验证码。'}</p><Button className="mini-full-button" variant="danger" disabled={!canUnbind} onClick={() => setConfirmUnbind(true)}>验证并解除绑定</Button><Button className="mini-full-button" variant="ghost" onClick={() => setScenario('standard')}>取消</Button></>}
    {active === 'unbind' && confirmUnbind && <div className="mini-sheet"><div><span className="mini-sheet__handle" /><h2>确认解除小程序绑定？</h2><p>解除后当前小程序会退出登录；再次使用时需要重新完成身份验证和绑定。</p><Button className="mini-full-button" variant="danger" onClick={() => navigateTo('MP-01')}>确认解除绑定</Button><Button className="mini-full-button" variant="secondary" onClick={() => setConfirmUnbind(false)}>暂不解除</Button></div></div>}
    {active === 'error' && <EmptyState icon="error" title="安全操作未完成" description="账号状态已变化或操作结果暂时无法确认。请重新登录核验，勿重复提交。" action={<Button onClick={() => navigateTo('MP-01')}>重新登录</Button>} />}
  </div></PhoneShell>;
}

export function MiniPrototype({ page, scenario: active, navigateTo, setScenario }: SurfacePrototypeProps) {
  const props = { scenario: active, navigateTo, setScenario };
  switch (page.id) {
    case 'MP-01': return <AuthScreen {...props} />;
    case 'MP-02': return <HomeScreen {...props} />;
    case 'MP-03': return <PracticeConfigScreen {...props} />;
    case 'MP-04': return <PracticeAnswerScreen {...props} />;
    case 'MP-05': return <WrongBookScreen {...props} />;
    case 'MP-06': return <MockConfigScreen {...props} />;
    case 'MP-07': return <MockAnswerScreen {...props} />;
    case 'MP-08': return <MockResultScreen {...props} />;
    case 'MP-09': return <FormalTasksScreen {...props} />;
    case 'MP-10': return <FormalDetailScreen {...props} />;
    case 'MP-11': return <RecordsScreen {...props} />;
    case 'MP-12': return <AccountScreen {...props} />;
    default: return <div className="surface-placeholder">{page.id} · {page.title}</div>;
  }
}
