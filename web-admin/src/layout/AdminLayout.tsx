import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAuth, getStoredSession } from '../api/client'

interface SessionDto {
  displayName: string
  employeeNo: string
}

const navGroups = [
  {
    label: '组织与员工',
    items: [
      { to: '/departments', label: '部门管理' },
      { to: '/employees', label: '员工管理' },
    ],
  },
  {
    label: '题库',
    items: [
      { to: '/question-banks', label: '题库管理' },
      { to: '/import', label: '题目导入' },
      { to: '/import/tasks', label: '导入任务' },
    ],
  },
  {
    label: '考试',
    items: [
      { to: '/exams', label: '考试管理' },
      { to: '/monitor', label: '考试监控' },
      { to: '/scores', label: '成绩报表' },
    ],
  },
  {
    label: '审计',
    items: [{ to: '/audit', label: '审计日志' }],
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const session = getStoredSession<SessionDto>()

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-title">考试系统</span>
          <span className="brand-sub">管理后台</span>
        </div>
        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? 'nav-link active' : 'nav-link'
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="main-area">
        <header className="top-bar">
          <div className="top-bar-user">
            {session ? `${session.displayName}（${session.employeeNo}）` : '管理员'}
          </div>
          <button type="button" className="btn-text" onClick={handleLogout}>
            退出
          </button>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
