import { useState, useEffect, useRef } from 'react';
import { wristbandAPI, abnormalRecordAPI } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import dayjs from 'dayjs';

const ABNORMAL_TYPES = [
  { value: '遗失', label: '遗失' },
  { value: '损坏', label: '损坏' },
  { value: '超时未归还', label: '超时未归还' },
  { value: '信息异常', label: '信息异常' },
  { value: '重复使用', label: '重复使用嫌疑' },
  { value: '其他', label: '其他异常' },
];

const STATUS_OPTIONS = ['待发放', '已发放', '待回收确认', '已回收', '异常观察', '停用'];

export default function Abnormal() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('report');
  const [filterHandled, setFilterHandled] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [records, setRecords] = useState([]);
  const [wristbandInfo, setWristbandInfo] = useState(null);
  const [checking, setChecking] = useState(false);
  const serialRef = useRef(null);

  const [reportForm, setReportForm] = useState({
    serial_number: '', abnormal_type: '遗失', description: '', missing_explanation: '',
  });

  useEffect(() => {
    if (activeTab === 'list') loadRecords();
  }, [activeTab, filterHandled, filterOverdue]);

  const loadRecords = async () => {
    try {
      const params = {};
      if (filterHandled !== '') params.handled = filterHandled === 'true';
      if (filterOverdue) params.overdue_only = true;
      const res = await abnormalRecordAPI.list(params);
      setRecords(res.data);
    } catch (e) { console.error(e); }
  };

  const handleSerialBlur = async () => {
    const sn = reportForm.serial_number.trim();
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

  const canReport = wristbandInfo && !wristbandInfo.error;

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!canReport) {
      showToast(wristbandInfo?.error || '请先输入有效的手环编号', 'error');
      return;
    }
    if (!reportForm.description) {
      showToast('请输入异常描述', 'warning');
      return;
    }
    if (reportForm.abnormal_type === '遗失' && !reportForm.missing_explanation?.trim()) {
      showToast('遗失类型必须填写缺失说明', 'warning');
      return;
    }
    try {
      const data = { ...reportForm };
      Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });
      await wristbandAPI.reportAbnormal(data);
      showToast('异常已记录，手环进入「异常观察」状态', 'success');
      setReportForm({ serial_number: '', abnormal_type: '遗失', description: '', missing_explanation: '' });
      setWristbandInfo(null);
      setTimeout(() => serialRef.current?.focus(), 100);
    } catch (e) {
      showToast(e.response?.data?.detail || '上报失败', 'error');
    }
  };

  const handleProcess = async (record) => {
    const result = prompt('请输入处理结果说明：');
    if (result === null || !result.trim()) {
      if (result !== null) showToast('请输入处理结果', 'warning');
      return;
    }
    const changeTo = prompt(
      '请选择处理后手环状态（留空则保持异常观察）：\n' +
      STATUS_OPTIONS.map((s, i) => `${i + 1}. ${s}`).join('\n') +
      '\n\n请输入数字序号或状态名称：'
    );
    if (changeTo === null) return;

    let changeStatus = null;
    if (changeTo.trim()) {
      const idx = parseInt(changeTo);
      if (idx >= 1 && idx <= STATUS_OPTIONS.length) {
        changeStatus = STATUS_OPTIONS[idx - 1];
      } else if (STATUS_OPTIONS.includes(changeTo.trim())) {
        changeStatus = changeTo.trim();
      } else {
        showToast('无效的状态选项', 'error');
        return;
      }
    }

    try {
      await wristbandAPI.handleAbnormal({
        abnormal_record_id: record.id,
        handling_result: result,
        change_status_to: changeStatus || undefined,
      });
      showToast('异常处理完成', 'success');
      loadRecords();
    } catch (e) {
      showToast(e.response?.data?.detail || '处理失败', 'error');
    }
  };

  const getTypeBadge = (t) => {
    const map = {
      '遗失': 'badge-red', '损坏': 'badge-orange',
      '超时未归还': 'badge-yellow', '信息异常': 'badge-purple',
      '重复使用': 'badge-red', '其他': 'badge-gray',
      '回收损坏': 'badge-orange', '回收遗失': 'badge-red',
    };
    return <span className={`badge ${map[t] || 'badge-gray'}`}>{t}</span>;
  };

  const getStatusBadge = (s) => {
    const map = {
      '待发放': 'status-待发放', '已发放': 'status-已发放',
      '待回收确认': 'status-待回收确认', '已回收': 'status-已回收',
      '异常观察': 'status-异常观察', '停用': 'status-停用',
    };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  const pendingCount = records.filter(r => !r.handled).length;

  return (
    <div>
      <div className="page-header">
        <h1>异常处理</h1>
        <p>上报手环异常情况，登记缺失说明，跟踪处理闭环</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>⚠️ 异常上报</button>
        <button className={`tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
          📋 异常记录
          {pendingCount > 0 && <span className="badge badge-red" style={{ marginLeft: 8 }}>{pendingCount}待处理</span>}
        </button>
      </div>

      {activeTab === 'report' && (
        <div className="grid grid-2">
          <div className="card">
            <div className="card-title"><span>异常情况上报表</span></div>
            <form onSubmit={handleReportSubmit}>
              <div className="alert alert-warning">
                ⚠️ 上报异常后，手环将自动进入「异常观察」状态，<strong>在此期间不得再次入场发放</strong>。
              </div>
              <div className="form-group">
                <label>手环编号 <span className="required">*</span></label>
                <input
                  ref={serialRef}
                  value={reportForm.serial_number}
                  onChange={e => { setReportForm({ ...reportForm, serial_number: e.target.value }); setWristbandInfo(null); }}
                  onBlur={handleSerialBlur}
                  placeholder="扫描或输入异常手环编号"
                  autoFocus
                />
                {checking && <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>正在查询...</div>}
                {wristbandInfo?.error && (
                  <div className="alert alert-error" style={{ marginTop: 10, padding: 10 }}>❌ {wristbandInfo.error}</div>
                )}
                {wristbandInfo && !wristbandInfo.error && (
                  <div className="alert alert-info" style={{ marginTop: 10, padding: 10 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>🔍 手环信息</div>
                    <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                      批次：<strong>{wristbandInfo.batch_code}</strong><br />
                      当前状态：{getStatusBadge(wristbandInfo.status)}
                      {wristbandInfo.abnormal_flag && <span className="badge badge-red" style={{ marginLeft: 6 }}>已标记异常</span>}
                      {wristbandInfo.is_overdue && (
                        <span className={`badge ${wristbandInfo.days_overdue > 7 ? 'badge-red' : 'badge-orange'}`} style={{ marginLeft: 6 }}>
                          逾期{wristbandInfo.days_overdue}天
                        </span>
                      )}
                      <br />
                      领取人：{wristbandInfo.recipient_name || '未知'}
                      {wristbandInfo.recipient_phone && ` (${wristbandInfo.recipient_phone})`}
                      <br />
                      发放时间：{wristbandInfo.issued_at ? dayjs(wristbandInfo.issued_at).format('YYYY-MM-DD HH:mm') : '-'}
                      &nbsp;&nbsp;预计归还：{wristbandInfo.expected_return_date || '-'}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>异常类型 <span className="required">*</span></label>
                <select value={reportForm.abnormal_type} onChange={e => setReportForm({ ...reportForm, abnormal_type: e.target.value })}>
                  {ABNORMAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>异常描述 <span className="required">*</span></label>
                <textarea
                  value={reportForm.description}
                  onChange={e => setReportForm({ ...reportForm, description: e.target.value })}
                  placeholder="请详细描述异常发生的情况、时间、地点..."
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>缺失说明
                  {reportForm.abnormal_type === '遗失' && <span className="required"> *</span>}
                </label>
                <textarea
                  value={reportForm.missing_explanation}
                  onChange={e => setReportForm({ ...reportForm, missing_explanation: e.target.value })}
                  placeholder={reportForm.abnormal_type === '遗失' ? '请详细说明手环遗失的原因、查找情况、责任归属等' : '若涉及手环或物品缺失，填写缺失原因说明'}
                  rows="3"
                />
              </div>

              <button type="submit" className="btn btn-danger btn-lg" style={{ width: '100%' }} disabled={!canReport}>
                ⚠️ 提交异常上报
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-title"><span>📌 异常处理流程</span></div>
            <div style={{ lineHeight: 2, fontSize: 14 }}>
              <div className="alert alert-error" style={{ marginTop: 0 }}>
                <strong>🚫 异常观察期间：</strong>手环禁止再次入场发放，系统自动拦截。
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--danger)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, flexShrink: 0
                  }}>1</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>发现并上报异常</div>
                    <div style={{ color: 'var(--text-light)', fontSize: 13 }}>
                      操作员登记异常类型、描述及缺失说明
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--warning)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, flexShrink: 0
                  }}>2</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>手环进入异常观察</div>
                    <div style={{ color: 'var(--text-light)', fontSize: 13 }}>
                      状态自动变更，发放流程拦截，避免重复入场
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--success)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, flexShrink: 0
                  }}>3</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>管理员处理闭环</div>
                    <div style={{ color: 'var(--text-light)', fontSize: 13 }}>
                      记录处理结果，根据情况变更手环状态（已回收/停用/待发放等）
                    </div>
                  </div>
                </div>
              </div>

              <hr style={{ margin: '24px 0', borderColor: 'var(--border)' }} />

              <div className="alert alert-info" style={{ marginTop: 0 }}>
                <strong>📊 智能识别功能：</strong>
              </div>
              <ul style={{ paddingLeft: 20, marginTop: 12 }}>
                <li style={{ marginBottom: 6 }}>
                  <strong>高频缺失识别：</strong>系统自动标记2次以上出现遗失的领取人
                </li>
                <li style={{ marginBottom: 6 }}>
                  <strong>回收滞后识别：</strong>标记超过预计归还日期未回收的手环
                </li>
                <li style={{ marginBottom: 6 }}>
                  <strong>闭环不完整识别：</strong>跟踪长时间未处理的异常工单
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <>
          <div className="filter-bar">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>处理状态</label>
              <select value={filterHandled} onChange={e => setFilterHandled(e.target.value)}>
                <option value="">全部</option>
                <option value="false">待处理</option>
                <option value="true">已处理</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap', marginBottom: 16 }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={filterOverdue} onChange={e => setFilterOverdue(e.target.checked)} />
                仅逾期手环
              </label>
              <button className="btn btn-secondary" onClick={() => { setFilterHandled(''); setFilterOverdue(false); }}>重置</button>
            </div>
          </div>
          <div className="card">
            {records.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🎉</div>
                <div>暂无异常记录，运营状况良好</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>手环编号</th>
                      <th>异常类型</th>
                      <th>描述</th>
                      <th>缺失说明</th>
                      <th>上报人</th>
                      <th>上报时间</th>
                      <th>处理状态</th>
                      <th>处理结果</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id} style={r.handled ? { opacity: 0.7 } : {}}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{r.serial_number}</td>
                        <td>{getTypeBadge(r.abnormal_type)}</td>
                        <td style={{ maxWidth: 200, fontSize: 13 }}>{r.description}</td>
                        <td style={{ maxWidth: 180, fontSize: 12, color: 'var(--text-light)' }}>
                          {r.missing_explanation || '-'}
                        </td>
                        <td>{r.reporter_name || '-'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{dayjs(r.reported_at).format('MM-DD HH:mm')}</td>
                        <td>
                          {r.handled
                            ? <span className="badge badge-green">已闭环</span>
                            : <span className="badge badge-red">待处理
                                {r.reported_at && dayjs().diff(dayjs(r.reported_at), 'hour') > 24 && (
                                  <span style={{ marginLeft: 4 }}>超时</span>
                                )}
                              </span>}
                        </td>
                        <td style={{ maxWidth: 180, fontSize: 12 }}>{r.handling_result || '-'}</td>
                        <td>
                          {!r.handled ? (
                            <button className="btn btn-sm" onClick={() => handleProcess(r)}>
                              处理闭环
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                              {r.handler_name}<br />
                              {r.handled_at && dayjs(r.handled_at).format('MM-DD HH:mm')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
