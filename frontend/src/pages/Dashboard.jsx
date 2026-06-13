import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { statsAPI } from '../api.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await statsAPI.get();
      setStats(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!stats) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;

  const cards = [
    { label: '手环总数', value: stats.total_wristbands, color: '', icon: '🎟️', to: '/batches', sub: `${stats.total_batches} 个批次` },
    { label: '待发放', value: stats.pending_issue, color: 'info', icon: '📦', to: '/batches' },
    { label: '已发放', value: stats.issued, color: '', icon: '✅', to: '/issue' },
    { label: '待回收确认', value: stats.pending_return_confirm, color: 'warning', icon: '⏳', to: '/return' },
    { label: '已回收', value: stats.returned, color: 'success', icon: '♻️', to: '/statistics' },
    { label: '异常观察', value: stats.abnormal_observation, color: 'danger', icon: '⚠️', to: '/abnormal' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>工作台</h1>
        <p>欢迎回来！以下是手环管理平台的整体情况概览</p>
      </div>

      <div className="grid grid-6">
        {cards.map((c, i) => (
          <Link key={i} to={c.to} style={{ textDecoration: 'none' }}>
            <div className={`stat-card ${c.color}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="label">{c.icon} {c.label}</div>
                  <div className="value">{c.value}</div>
                  {c.sub && <div className="sub">{c.sub}</div>}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-title">
            <span>📋 待处理清单</span>
            <span className="badge badge-red">{stats.pending_items.count} 项</span>
          </div>
          <div>
            {stats.pending_items.items.map((item, i) => (
              <div key={i} className="list-item">
                <span style={{ fontWeight: 500 }}>{item.type}</span>
                <span className={`badge ${item.type.includes('异常') ? 'badge-red' : item.type.includes('逾期') ? 'badge-orange' : 'badge-yellow'}`}>
                  {item.count}
                </span>
              </div>
            ))}
            {stats.pending_items.count === 0 && <div className="empty"><div className="empty-icon">🎉</div>暂无待处理事项</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-title"><span>🎨 颜色使用分布</span></div>
          <div>
            {stats.color_distribution.length === 0 ? (
              <div className="empty"><div className="empty-icon">📊</div>暂无数据</div>
            ) : (
              stats.color_distribution.map((c, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span className="color-tag">
                      <span className="color-dot" style={{ background: c.color_hex }}></span>
                      {c.color}
                    </span>
                    <span style={{ color: 'var(--text-light)' }}>{c.count} ({c.percentage}%)</span>
                  </div>
                  <div className="progress-bar">
                    <div style={{ width: `${c.percentage}%`, background: c.color_hex }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>👥 责任人负载 TOP</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>责任人</th>
                  <th style={{ textAlign: 'center' }}>已发放</th>
                  <th style={{ textAlign: 'center' }}>已回收</th>
                  <th style={{ textAlign: 'center' }}>异常</th>
                </tr>
              </thead>
              <tbody>
                {stats.responsible_load.slice(0, 6).map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{r.person_name}</td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-blue">{r.issued_count}</span></td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-green">{r.returned_count}</span></td>
                    <td style={{ textAlign: 'center' }}><span className={`badge ${r.abnormal_count > 0 ? 'badge-red' : 'badge-gray'}`}>{r.abnormal_count}</span></td>
                  </tr>
                ))}
                {stats.responsible_load.length === 0 && (
                  <tr><td colSpan="4" className="empty">暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>⚠️ 智能识别：异常闭环不完整</span>
            <Link to="/abnormal" className="btn btn-sm btn-secondary">查看全部</Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>手环编号</th>
                  <th>异常类型</th>
                  <th style={{ textAlign: 'center' }}>等待(小时)</th>
                </tr>
              </thead>
              <tbody>
                {stats.incomplete_abnormal.slice(0, 6).map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace' }}>{r.serial_number}</td>
                    <td><span className="badge badge-red">{r.abnormal_type}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${r.hours_pending > 24 ? 'badge-red' : 'badge-yellow'}`}>{r.hours_pending}h</span>
                    </td>
                  </tr>
                ))}
                {stats.incomplete_abnormal.length === 0 && (
                  <tr><td colSpan="3" className="empty">🎉 所有异常已闭环</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
