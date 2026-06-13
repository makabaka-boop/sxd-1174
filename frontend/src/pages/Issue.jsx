import { useState, useEffect, useRef } from 'react';
import { wristbandAPI, batchAPI, colorRuleAPI, issueRecordAPI } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import dayjs from 'dayjs';

export default function Issue() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('issue');
  const [batches, setBatches] = useState([]);
  const [colors, setColors] = useState([]);
  const [wristbandInfo, setWristbandInfo] = useState(null);
  const [checking, setChecking] = useState(false);
  const serialRef = useRef(null);

  const [form, setForm] = useState({
    serial_number: '',
    recipient_name: '',
    recipient_phone: '',
    recipient_id_card: '',
    expected_return_date: '',
    remark: '',
    issue_location: '',
  });

  const [records, setRecords] = useState([]);
  const [filterBatch, setFilterBatch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadSelectData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') loadRecords();
  }, [activeTab, filterBatch, dateFrom, dateTo]);

  const loadSelectData = async () => {
    const [b, c] = await Promise.all([batchAPI.list(), colorRuleAPI.list()]);
    setBatches(b.data);
    setColors(c.data);
  };

  const loadRecords = async () => {
    try {
      const params = {};
      if (filterBatch) params.batch_id = filterBatch;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await issueRecordAPI.list(params);
      setRecords(res.data);
    } catch (e) { console.error(e); }
  };

  const handleSerialBlur = async () => {
    const sn = form.serial_number.trim();
    if (!sn) {
      setWristbandInfo(null);
      return;
    }
    setChecking(true);
    try {
      const res = await wristbandAPI.get(sn);
      setWristbandInfo(res.data);
      if (res.data.expected_return_date && !form.expected_return_date) {
        setForm(f => ({ ...f, expected_return_date: res.data.expected_return_date }));
      }
    } catch (e) {
      setWristbandInfo({ error: e.response?.data?.detail || '手环不存在' });
    } finally {
      setChecking(false);
    }
  };

  const canIssue = wristbandInfo && !wristbandInfo.error && wristbandInfo.status !== '已发放' &&
    wristbandInfo.status !== '异常观察' && wristbandInfo.status !== '停用';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canIssue) {
      showToast(wristbandInfo?.error || '该手环状态不允许发放', 'error');
      return;
    }
    if (!form.recipient_name) {
      showToast('请输入领取人姓名', 'warning');
      return;
    }
    try {
      const data = { ...form };
      Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });
      await wristbandAPI.issue(data);
      showToast(`发放成功！手环 ${form.serial_number} 已登记`, 'success');
      setForm({ serial_number: '', recipient_name: '', recipient_phone: '', recipient_id_card: '', expected_return_date: form.expected_return_date, remark: '', issue_location: form.issue_location });
      setWristbandInfo(null);
      setTimeout(() => serialRef.current?.focus(), 100);
    } catch (e) {
      showToast(e.response?.data?.detail || '发放失败', 'error');
    }
  };

  const getStatusBadge = (s) => {
    const map = {
      '待发放': 'status-待发放',
      '已发放': 'status-已发放',
      '待回收确认': 'status-待回收确认',
      '已回收': 'status-已回收',
      '异常观察': 'status-异常观察',
      '停用': 'status-停用',
    };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  const getColorHex = (c) => colors.find(x => x.color === c)?.color_hex || '#6B7280';

  return (
    <div>
      <div className="page-header">
        <h1>发放登记</h1>
        <p>扫描或输入手环编号，登记领取人信息完成发放</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'issue' ? 'active' : ''}`} onClick={() => setActiveTab('issue')}>🎫 发放登记</button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>📋 发放记录</button>
      </div>

      {activeTab === 'issue' && (
        <div className="grid grid-2">
          <div className="card">
            <div className="card-title"><span>手环发放登记表</span></div>
            <form onSubmit={handleSubmit}>
              <div className="alert alert-info">
                ℹ️ 输入手环编号后将自动校验：是否存在、是否已发放、是否处于异常观察、颜色是否与批次匹配
              </div>
              <div className="form-group">
                <label>手环编号 <span className="required">*</span></label>
                <input
                  ref={serialRef}
                  value={form.serial_number}
                  onChange={e => { setForm({ ...form, serial_number: e.target.value }); setWristbandInfo(null); }}
                  onBlur={handleSerialBlur}
                  placeholder="扫描或输入手环编号，如 WB000001"
                  autoFocus
                />
                {checking && <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>正在校验...</div>}
                {wristbandInfo?.error && (
                  <div className="alert alert-error" style={{ marginTop: 10, padding: 10 }}>❌ {wristbandInfo.error}</div>
                )}
                {wristbandInfo && !wristbandInfo.error && (
                  <div className={`alert ${canIssue ? 'alert-success' : 'alert-warning'}`} style={{ marginTop: 10, padding: 10 }}>
                    <div style={{ marginBottom: 6, fontWeight: 600 }}>
                      {canIssue ? '✅ 校验通过，可以发放' : '⚠️ 校验不通过'}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                      批次：<strong>{wristbandInfo.batch_code}</strong> {wristbandInfo.batch_name && `(${wristbandInfo.batch_name})`}<br />
                      颜色：<span className="color-tag"><span className="color-dot" style={{ background: getColorHex(wristbandInfo.color) }}></span>{wristbandInfo.color}</span>
                      &nbsp;&nbsp;状态：{getStatusBadge(wristbandInfo.status)}<br />
                      柜位：{wristbandInfo.cabinet_code || '-'} &nbsp;&nbsp; 责任人：{wristbandInfo.responsible_person_name || '-'}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>领取人姓名 <span className="required">*</span></label>
                  <input value={form.recipient_name} onChange={e => setForm({ ...form, recipient_name: e.target.value })} placeholder="请输入姓名" />
                </div>
                <div className="form-group">
                  <label>联系电话</label>
                  <input value={form.recipient_phone} onChange={e => setForm({ ...form, recipient_phone: e.target.value })} placeholder="手机号" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>身份证号</label>
                  <input value={form.recipient_id_card} onChange={e => setForm({ ...form, recipient_id_card: e.target.value })} placeholder="可选" />
                </div>
                <div className="form-group">
                  <label>预计归还日期</label>
                  <input type="date" value={form.expected_return_date} onChange={e => setForm({ ...form, expected_return_date: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>发放地点</label>
                  <input value={form.issue_location} onChange={e => setForm({ ...form, issue_location: e.target.value })} placeholder="如 主入口A通道" />
                </div>
                <div className="form-group">
                  <label>备注</label>
                  <input value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} placeholder="特殊情况备注" />
                </div>
              </div>

              <button type="submit" className="btn btn-success btn-lg" style={{ width: '100%' }} disabled={!canIssue}>
                🎟️ 确认发放登记
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-title"><span>📌 发放注意事项</span></div>
            <div style={{ lineHeight: 2, fontSize: 14, color: 'var(--text)' }}>
              <div className="alert alert-warning" style={{ marginTop: 0 }}>
                <strong>🔒 系统校验规则：</strong>
              </div>
              <ul style={{ paddingLeft: 20, marginTop: 12 }}>
                <li style={{ marginBottom: 8 }}>
                  <strong>重复发放拦截：</strong>
                  状态为「已发放」的手环不能再次发放
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>颜色规则校验：</strong>
                  若批次指定了颜色规则，手环颜色必须匹配
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>异常观察拦截：</strong>
                  处于「异常观察」的手环不得再次入场发放
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>停用拦截：</strong>
                  「停用」状态的手环无法发放
                </li>
              </ul>
              <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
              <div className="alert alert-info" style={{ marginTop: 0 }}>
                <strong>💡 操作建议：</strong>
              </div>
              <ul style={{ paddingLeft: 20, marginTop: 12 }}>
                <li style={{ marginBottom: 8 }}>使用扫码枪扫描手环编号效率更高</li>
                <li style={{ marginBottom: 8 }}>必填项：手环编号 + 领取人姓名</li>
                <li style={{ marginBottom: 8 }}>预计归还日期为空时使用批次默认值</li>
                <li style={{ marginBottom: 8 }}>发放完成后系统自动跳回编号输入框</li>
              </ul>
            </div>

            <div style={{ marginTop: 24 }}>
              <div className="card-title" style={{ marginBottom: 12, fontSize: 16 }}><span>🏷️ 颜色含义速查</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {colors.map(c => (
                  <span key={c.id} className="chip" style={{ background: getColorHex(c.color) + '20', color: c.color_hex, border: `1px solid ${c.color_hex}40` }}>
                    <span className="color-dot" style={{ background: c.color_hex }}></span>
                    &nbsp;{c.color}{c.meaning && ` - ${c.meaning}`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <>
          <div className="filter-bar">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>批次</label>
              <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)}>
                <option value="">全部</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>开始日期</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>结束日期</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <button className="btn btn-secondary" onClick={() => { setFilterBatch(''); setDateFrom(''); setDateTo(''); }}>重置</button>
          </div>
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>手环编号</th>
                    <th>领取人</th>
                    <th>联系电话</th>
                    <th>发放人</th>
                    <th>发放地点</th>
                    <th>发放时间</th>
                    <th>预计归还</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'monospace' }}>{r.serial_number}</td>
                      <td style={{ fontWeight: 500 }}>{r.recipient_name}</td>
                      <td>{r.recipient_phone || '-'}</td>
                      <td>{r.issue_person_name || '-'}</td>
                      <td>{r.issue_location || '-'}</td>
                      <td>{dayjs(r.issued_at).format('YYYY-MM-DD HH:mm')}</td>
                      <td>{r.expected_return_date || '-'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{r.remark || '-'}</td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr><td colSpan="8" className="empty"><div className="empty-icon">📋</div>暂无发放记录</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
