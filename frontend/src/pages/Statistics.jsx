import { useState, useEffect } from 'react';
import { statsAPI } from '../api.js';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LineChart, Line, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await statsAPI.get();
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;
  if (!stats) return <div style={{ padding: 40, textAlign: 'center' }}>数据加载失败</div>;

  const pieData = stats.color_distribution.map(c => ({
    name: c.color,
    value: c.count,
    fill: c.color_hex,
  }));

  const trendData = stats.recovery_rate_trend;

  const statusData = [
    { name: '待发放', value: stats.pending_issue, fill: '#0891b2' },
    { name: '已发放', value: stats.issued, fill: '#2563eb' },
    { name: '待回收确认', value: stats.pending_return_confirm, fill: '#ca8a04' },
    { name: '已回收', value: stats.returned, fill: '#16a34a' },
    { name: '异常观察', value: stats.abnormal_observation, fill: '#dc2626' },
    { name: '停用', value: stats.disabled, fill: '#6b7280' },
  ];

  const loadData = stats.responsible_load.map(r => ({
    name: r.person_name.length > 4 ? r.person_name.slice(0, 4) + '..' : r.person_name,
    已发放: r.issued_count,
    已回收: r.returned_count,
    异常: r.abnormal_count,
  }));

  const radarData = stats.responsible_load.slice(0, 5).map(r => ({
    subject: r.person_name.length > 4 ? r.person_name.slice(0, 4) : r.person_name,
    发放: Math.min(100, r.issued_count * 5),
    回收: Math.min(100, r.returned_count * 5),
    异常率: Math.min(100, 100 - r.abnormal_count * 10),
  }));

  return (
    <div>
      <div className="page-header">
        <h1>统计概览</h1>
        <p>多维度数据透视，智能识别运营异常</p>
      </div>

      <div className="grid grid-6">
        <div className="stat-card">
          <div className="label">🏷️ 手环总数</div>
          <div className="value">{stats.total_wristbands}</div>
          <div className="sub">{stats.total_batches} 个批次</div>
        </div>
        <div className="stat-card info">
          <div className="label">📦 待发放</div>
          <div className="value">{stats.pending_issue}</div>
          <div className="sub">占比 {stats.total_wristbands ? Math.round(stats.pending_issue / stats.total_wristbands * 100) : 0}%</div>
        </div>
        <div className="stat-card">
          <div className="label">✅ 已发放</div>
          <div className="value">{stats.issued}</div>
          <div className="sub">占比 {stats.total_wristbands ? Math.round(stats.issued / stats.total_wristbands * 100) : 0}%</div>
        </div>
        <div className="stat-card success">
          <div className="label">♻️ 已回收</div>
          <div className="value">{stats.returned}</div>
          <div className="sub">及时率 {stats.recovery_timely_rate}%</div>
        </div>
        <div className="stat-card warning">
          <div className="label">⏳ 待回收确认</div>
          <div className="value">{stats.pending_return_confirm}</div>
          <div className="sub">请尽快处理</div>
        </div>
        <div className="stat-card danger">
          <div className="label">⚠️ 异常观察</div>
          <div className="value">{stats.abnormal_observation}</div>
          <div className="sub">禁止入场</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-title"><span>🎨 颜色使用分布</span></div>
          {pieData.length === 0 ? (
            <div className="empty"><div className="empty-icon">📊</div>暂无数据</div>
          ) : (
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title"><span>📊 手环状态分布</span></div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>📈 回收及时率趋势（近7天）</span>
            <span className="badge badge-green">及时率 {stats.recovery_timely_rate}%</span>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={d => d.slice(5)} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="issued_count" name="发放量" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="left" type="monotone" dataKey="returned_count" name="回收量" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="timely_rate" name="及时率(%)" stroke="#9333ea" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-title"><span>👥 责任人负载分析</span></div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={loadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="已发放" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="已回收" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="异常" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-title">
            <span>🚨 智能识别：高频缺失人员</span>
            <span className="badge badge-red">{stats.high_frequency_missing.length} 人</span>
          </div>
          {stats.high_frequency_missing.length === 0 ? (
            <div className="empty"><div className="empty-icon">🎉</div>未识别到高频缺失人员</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>领取人</th>
                    <th style={{ textAlign: 'center' }}>缺失次数</th>
                    <th>涉及手环</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.high_frequency_missing.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>
                        <span className="badge badge-red" style={{ marginRight: 8 }}>⚠️ {p.count}次</span>
                        {p.person_name}
                      </td>
                      <td style={{ textAlign: 'center' }}>{p.count}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)', fontFamily: 'monospace' }}>
                        {p.serial_numbers.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <span>⏰ 智能识别：回收滞后</span>
            <span className="badge badge-orange">{stats.recovery_lag.length} 个</span>
          </div>
          {stats.recovery_lag.length === 0 ? (
            <div className="empty"><div className="empty-icon">🎉</div>暂无逾期未回收手环</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>手环编号</th>
                    <th>领取人</th>
                    <th>应归还日期</th>
                    <th style={{ textAlign: 'center' }}>逾期天数</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recovery_lag.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace' }}>{r.serial_number}</td>
                      <td>{r.recipient_name}</td>
                      <td>{r.expected_return_date}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${r.days_overdue > 7 ? 'badge-red' : 'badge-orange'}`}>
                          {r.days_overdue} 天
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-title">
            <span>⚠️ 智能识别：异常闭环不完整</span>
            <span className="badge badge-red">{stats.incomplete_abnormal.length} 项</span>
          </div>
          {stats.incomplete_abnormal.length === 0 ? (
            <div className="empty"><div className="empty-icon">✅</div>所有异常均已闭环处理</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>记录ID</th>
                    <th>手环编号</th>
                    <th>异常类型</th>
                    <th>上报时间</th>
                    <th style={{ textAlign: 'center' }}>等待时长</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.incomplete_abnormal.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace' }}>#{r.abnormal_record_id}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{r.serial_number}</td>
                      <td><span className="badge badge-red">{r.abnormal_type}</span></td>
                      <td>{new Date(r.reported_at).toLocaleString('zh-CN')}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${r.hours_pending > 48 ? 'badge-red' : r.hours_pending > 24 ? 'badge-orange' : 'badge-yellow'}`}>
                          {r.hours_pending.toFixed(1)} 小时
                        </span>
                      </td>
                      <td>
                        {r.hours_pending > 48 ? (
                          <span className="badge badge-red">🔥 严重超时</span>
                        ) : r.hours_pending > 24 ? (
                          <span className="badge badge-orange">已超1天</span>
                        ) : (
                          <span className="badge badge-yellow">待处理</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
