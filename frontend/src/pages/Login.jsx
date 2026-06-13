import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { authAPI } from '../api.js';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('请输入用户名和密码', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login({ username, password });
      login(res.data);
      showToast('登录成功', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      showToast(err.response?.data?.detail || '登录失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>🎟️ 入场手环管理平台</h1>
        <p>请登录您的账号以继续</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名 <span className="required">*</span></label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>密码 <span className="required">*</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
        <div className="login-tip">
          <strong>默认测试账号：</strong><br />
          管理员：admin / admin123<br />
          操作员：operator / operator123
        </div>
      </div>
    </div>
  );
}
