import { useState, useEffect, useRef } from 'react';
import { wristbandAPI, returnRecordAPI } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import dayjs from 'dayjs';

export default function ReturnConfirm() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('return');
  const [wristbandInfo, setWristbandInfo] = useState(null);
  const [checking, setChecking] = useState(false);
  const serialRef = useRef(null);
  const [pending, setPending] = useState([]);

  const [form, setForm] = useState({
    serial_number: '',
    condition: '完好',
    remark: '',
    return_location: '',
  });

  useEffect(() => {
    if (activeTab === 'confirm') loadPending();
  }, [activeTab]);

  const loadPending = async () => {
    try {
      const res = await returnRecordAPI.list({ confirmed: false });
      setPending(res.data);
    } catch (e) { console.error(e); }
  };

  const handleSerialBlur = async () => {
    const sn = form.serial_number.trim();
    if (!sn) { setWristbandInfo(null); return; }
    setChecking(true);
    try {
      const res = await wristbandAPI.get(sn);
      setWristbandInfo(res.data);
    } catch (e) {
      setWristbandInfo({ error: e.response?.data?.detail || '手环不存在' });
    } finally {
      setChecking(false);
    }
  };

  const canReturn = wristbandInfo && !wristbandInfo.error &&
    (wristbandInfo.status === '已发放' || wristbandInfo.status === '异常观察');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canReturn) {
      showToast(wristbandInfo?.error || `当前状态「${wristbandInfo?.status}」无法回收`, 'error');
      return;
    }
    try {
      const data = { ...form };
      Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });
      await wristbandAPI.return(data);
      showToast(`回收提交成功！等待后续确认`, 'success');
      setForm({ serial_number: '', condition: '完好', remark: '', return_location: form.return_location });
      setWristbandInfo(null);
      setTimeout(() => serialRef.current?.focus(), 100);
    } catch (e) {
      showToast(e.response?.data?.detail || '回收失败', 'error');
    }
  };

  const handleConfirm = async (record) => {
    const remark = prompt('请输入确认备注（可选）：');
    if (remark === null) return;
    try {
      await wristbandAPI.confirmReturn({ return_record_id: record.id, remark: remark || undefined });
      showToast('回收确认完成', 'success');
      loadPending();
    } catch (e) {
      showToast(e.response?.data?.detail || '确认失败', 'error');
    }
  };

  const getStatusBadge = (s) => {
    const map = {
      '待发放': 'status-待发放', '已发放': 'status-已发放',
      '待回收确认': 'status-待回收确认', '已回收': 'status-已回收',
      '异常观察': 'status-异常观察', '停用': 'status-停用',
    };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  const getConditionBadge = (c) => {
    const map = {
      '完好': 'badge-green', '轻微磨损': 'badge-yellow',
      '损坏': 'badge-orange', '遗失': 'badge-red'
    };
    return <span className={`badge ${map[c] || 'badge-gray'}`}>{c}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>回收确认</h1>
        <p>扫描手环提交回收，由管理员进行二次确认闭环</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'return' ? 'active' : ''}`} onClick={() => setActiveTab('return')}>♻️ 回收提交</button>
        <button className={`tab ${activeTab === 'confirm' ? 'active' : ''}`} onClick={() => setActiveTab('confirm')}>
          ⏳ 待确认清单
          {pending.length > 0 && <span className="badge badge-red" style={{ marginLeft: 8 }}>{pending.length}</span>}
        </button>
      </div>

      {activeTab === 'return' && (
        <div className="grid grid-2">
          <div className="card">
            <div className="card-title"><span>手环回收登记表</span></div>
            <form onSubmit={handleSubmit}>
              <div className="alert alert-info">
                ℹ️ 回收后状态变为「待回收确认」，需要管理员确认后才算闭环。
                若手环损坏或遗失，确认后自动进入「异常观察」。
              </div>
              <div className="form-group">
                <label>手环编号 <span className="required">*</span></label>
                <input
                  ref={serialRef}
                  value={form.serial_number}
                  onChange={e => { setForm({ ...form, serial_number: e.target.value }); setWristbandInfo(null); }}
                  onBlur={handleSerialBlur}
                  placeholder="扫描或输入手环编号"
                  autoFocus
                />
                {checking && <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>正在校验...</div>}
                {wristbandInfo?.error && (
                  <div className="alert alert-error" style={{ marginTop: 10, padding: 10 }}>❌ {wristbandInfo.error}</div>
                )}
                {wristbandInfo && !wristbandInfo.error && (
                  <div className={`alert ${canReturn ? 'alert-success' : 'alert-warning'}`} style={{ marginTop: 10, padding: 10 }}>
                    <div style={{ marginBottom: 6, fontWeight: 600 }}>
                      {canReturn ? '✅ 可以回收' : '⚠️ 不满足回收条件'}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                      批次：<strong>{wristbandInfo.batch_code}</strong><br />
                      领取人：<strong>{wristbandInfo.recipient_name || '未知'}</strong>
                      {wristbandInfo.recipient_phone && ` (${wristbandInfo.recipient_phone})`}<br />
                      状态：{getStatusBadge(wristbandInfo.status)}
                      {wristbandInfo.abnormal_flag && <span className="badge badge-red" style={{ marginLeft: 6 }}>异常</span>}
                      <br />
                      发放时间：{wristbandInfo.issued_at ? dayjs(wristbandInfo.issued_at).format('YYYY-MM-DD HH:mm') : '-'}
                      &nbsp;&nbsp;预计归还：{wristbandInfo.expected_return_date || '-'}
                      {wristbandInfo.expected_return_date && dayjs(wristbandInfo.expected_return_date).isBefore(dayjs(), 'day') && (
                        <span className="badge badge-red" style={{ marginLeft: 6 }}>逾期</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>手环状况 <span className="required">*</span></label>
                  <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                    <option value="完好">完好</option>
                    <option value="轻微磨损">轻微磨损</option>
                    <option value="损坏">损坏</option>
                    <option value="遗失">遗失（未归还）</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>回收地点</label>
                  <input value={form.return_location} onChange={e => setForm({ ...form, return_location: e.target.value })} placeholder="如 出口回收台" />
                </div>
              </div>

              <div className="form-group">
                <label>备注说明</label>
                <textarea value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} placeholder="异常情况说明等"></textarea>
              </div>

              <button type="submit" className="btn btn-success btn-lg" style={{ width: '100%' }} disabled={!canReturn}>
                ♻️ 提交回收（待确认）
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-title"><span>📌 回收流程说明</span></div>
            <div style={{ lineHeight: 2, fontSize: 14 }}>
              <div className="alert alert-warning" style={{ marginTop: 0 }}>
                <strong>🔄 两阶段回收机制：</strong>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, flexShrink: 0
                  }}>1</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>操作员提交回收</div>
                    <div style={{ color: 'var(--text-light)', fontSize: 13 }}>
                      扫描手环，记录状况。手环状态变为「待回收确认」
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--success)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, flexShrink: 0
                  }}>2</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>管理员确认闭环</div>
                    <div style={{ color: 'var(--text-light)', fontSize: 13 }}>
                      核实回收记录。完好→「已回收」；损坏/遗失→「异常观察」+ 记录异常类型
                    </div>
                  </div>
                </div>
              </div>

              <hr style={{ margin: '24px 0', borderColor: 'var(--border)' }} />

              <div className="alert alert-info" style={{ marginTop: 0 }}>
                <strong>💡 状况说明：</strong>
              </div>
              <ul style={{ paddingLeft: 20, marginTop: 12 }}>
                <li style={{ marginBottom: 6 }}><strong>完好：</strong>手环正常回收，状态变为「已回收」</li>
                <li style={{ marginBottom: 6 }}><strong>轻微磨损：</strong>手环有使用痕迹但可复用</li>
                <li style={{ marginBottom: 6 }}><strong>损坏：</strong>手环无法继续使用，进入异常观察</li>
                <li style={{ marginBottom: 6 }}><strong>遗失：</strong>手环未归还，进入异常观察并记录缺失</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'confirm' && (
        <div className="card">
          {pending.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🎉</div>
              <div>暂无待确认的回收记录，一切回收流程已闭环</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>手环编号</th>
                    <th>回收人</th>
                    <th>回收地点</th>
                    <th>状况</th>
                    <th>回收时间</th>
                    <th>备注</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{r.serial_number}</td>
                      <td>{r.return_person_name || '-'}</td>
                      <td>{r.return_location || '-'}</td>
                      <td>{getConditionBadge(r.condition)}</td>
                      <td>{dayjs(r.returned_at).format('YYYY-MM-DD HH:mm')}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{r.remark || '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-success" onClick={() => handleConfirm(r)}>
                          ✅ 确认回收
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
