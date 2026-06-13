import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { path: '/dashboard', label: '工作台', icon: '📊' },
  { path: '/batches', label: '批次管理', icon: '📦' },
  { path: '/issue', label: '发放登记', icon: '🎫' },
  { path: '/return', label: '回收确认', icon: '♻️' },
  { path: '/abnormal', label: '异常处理', icon: '⚠️' },
  { path: '/statistics', label: '统计概览', icon: '📈' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>🎟️ 手环管理</h2>
          <p>入场手环管理平台</p>
        </div>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>入场手环管理平台</h2>
          </div>
          <div className="topbar-user">
            <div className="user-info">
              <div className="name">{user?.full_name || user?.username}</div>
              <div className="role">{user?.role === 'admin' ? '管理员' : '操作员'}</div>
            </div>
            <div className="user-avatar">
              {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              退出
            </button>
          </div>
        </header>

        <div className="container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
