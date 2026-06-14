import { useState, useEffect } from 'react';
import { transferAPI, batchAPI, colorRuleAPI, cabinetAPI, personAPI } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import dayjs from 'dayjs';
import WristbandTimeline from '../components/WristbandTimeline.jsx';

export default function Transfer() {
  const [activeTab, setActiveTab] = useState('records');
  const [batches, setBatches] = useState([]);
  const [colors, setColors] = useState([]);
  const [cabinets, setCabinets] = useState([]);
  const [persons, setPersons] = useState([]);

  const [transferRecords, setTransferRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [recordFilters, setRecordFilters] = useState({
    status: '',
    serial_number: '',
    from_cabinet_id: '',
    to_cabinet_id: '',
    date_from: '',
    date_to: ''
  });

  const [transferableWristbands, setTransferableWristbands] = useState([]);
  const [wristbandFilters, setWristbandFilters] = useState({
    serial_number: '',
    batch_id: '',
    color: '',
    cabinet_id: ''
  });
  const [selectedWristbandIds, setSelectedWristbandIds] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    to_cabinet_id: '',
    to_responsible_person_id: '',
    transfer_reason: '',
    remark: ''
  });
  const [timelineSerial, setTimelineSerial] = useState(null);

  const { showToast } = useToast();

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (activeTab === 'records') {
      loadTransferRecords();
    } else {
      loadTransferableWristbands();
    }
  }, [activeTab, page, recordFilters, wristbandFilters]);

  const loadBaseData = async () => {
    try {
      const [b, c, cab, p] = await Promise.all([
        batchAPI.list(), colorRuleAPI.list(), cabinetAPI.list(), personAPI.list()
      ]);
      setBatches(b.data);
      setColors(c.data);
      setCabinets(cab.data);
      setPersons(p.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTransferRecords = async () => {
    try {
      const params = { ...recordFilters, page, page_size: 50 };
      Object.keys(params).forEach(k => {
        if (params[k] === '' || params[k] == null) delete params[k];
      });
      const res = await transferAPI.list(params);
      setTransferRecords(res.data.items);
      setTotalRecords(res.data.total);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTransferableWristbands = async () => {
    try {
      const params = { ...wristbandFilters };
      Object.keys(params).forEach(k => {
        if (params[k] === '' || params[k] == null) delete params[k];
      });
      const res = await transferAPI.listTransferable(params);
      const items = res.data;
      setTransferableWristbands(items);
      const visibleIds = new Set(items.map(w => w.id));
      setSelectedWristbandIds(prev => {
        const filtered = prev.filter(id => visibleIds.has(id));
        if (filtered.length !== prev.length) {
          const removedCount = prev.length - filtered.length;
          showToast(`筛选条件变更，已自动移除 ${removedCount} 个不在当前列表中的已选手环`, 'info');
        }
        return filtered;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelectWristband = (id) => {
    setSelectedWristbandIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const allIds = transferableWristbands.map(w => w.id);
    if (selectedWristbandIds.length === allIds.length) {
      setSelectedWristbandIds([]);
    } else {
      setSelectedWristbandIds(allIds);
    }
  };

  const handleOpenCreateModal = () => {
    if (selectedWristbandIds.length === 0) {
      showToast('请先选择要调拨的手环', 'warning');
      return;
    }
    setTransferForm({
      to_cabinet_id: '',
      to_responsible_person_id: '',
      transfer_reason: '',
      remark: ''
    });
    setShowCreateModal(true);
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.to_cabinet_id) {
      showToast('请选择目标柜位', 'warning');
      return;
    }
    if (!transferForm.to_responsible_person_id) {
      showToast('请选择目标负责人', 'warning');
      return;
    }
    try {
      const res = await transferAPI.create({
        wristband_ids: selectedWristbandIds,
        to_cabinet_id: Number(transferForm.to_cabinet_id),
        to_responsible_person_id: Number(transferForm.to_responsible_person_id),
        transfer_reason: transferForm.transfer_reason || undefined,
        remark: transferForm.remark || undefined
      });
      showToast(`成功创建 ${res.data.created} 条调拨记录`, 'success');
      setShowCreateModal(false);
      setSelectedWristbandIds([]);
      loadTransferableWristbands();
      setActiveTab('records');
    } catch (e) {
      showToast(e.response?.data?.detail || '创建调拨失败', 'error');
    }
  };

  const handleConfirmTransfer = async (id) => {
    if (!confirm('确认执行此调拨操作？确认后手环所属柜位和负责人将被更新。')) return;
    try {
      await transferAPI.confirm(id);
      showToast('调拨确认成功', 'success');
      loadTransferRecords();
    } catch (e) {
      showToast(e.response?.data?.detail || '确认失败', 'error');
    }
  };

  const handleCancelTransfer = async (id) => {
    if (!confirm('确定取消此调拨单？')) return;
    try {
      await transferAPI.cancel(id);
      showToast('调拨已取消', 'success');
      loadTransferRecords();
    } catch (e) {
      showToast(e.response?.data?.detail || '取消失败', 'error');
    }
  };

  const getStatusBadge = (s) => {
    const map = {
      '待确认': 'status-待回收确认',
      '已确认': 'status-已回收',
      '已取消': 'status-停用'
    };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  const getColorHex = (c) => colors.find(x => x.color === c)?.color_hex || '#6B7280';

  const totalPages = Math.ceil(totalRecords / 50);

  return (
    <div>
      <div className="page-header">
        <h1>调拨管理</h1>
        <p>在不同柜位、负责人之间调拨手环，支持调拨登记、确认和记录查询</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'records' ? 'active' : ''}`} onClick={() => setActiveTab('records')}>
          📋 调拨记录
        </button>
        <button className={`tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
          🔄 新建调拨
        </button>
      </div>

      {activeTab === 'records' && (
        <>
          <div className="filter-bar" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>状态</label>
              <select value={recordFilters.status} onChange={e => setRecordFilters({ ...recordFilters, status: e.target.value })}>
                <option value="">全部</option>
                <option value="待确认">待确认</option>
                <option value="已确认">已确认</option>
                <option value="已取消">已取消</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>手环编号</label>
              <input placeholder="输入编号" value={recordFilters.serial_number} onChange={e => setRecordFilters({ ...recordFilters, serial_number: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>原柜位</label>
              <select value={recordFilters.from_cabinet_id} onChange={e => setRecordFilters({ ...recordFilters, from_cabinet_id: e.target.value })}>
                <option value="">全部</option>
                {cabinets.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>目标柜位</label>
              <select value={recordFilters.to_cabinet_id} onChange={e => setRecordFilters({ ...recordFilters, to_cabinet_id: e.target.value })}>
                <option value="">全部</option>
                {cabinets.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>开始日期</label>
              <input type="date" value={recordFilters.date_from} onChange={e => setRecordFilters({ ...recordFilters, date_from: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>结束日期</label>
              <input type="date" value={recordFilters.date_to} onChange={e => setRecordFilters({ ...recordFilters, date_to: e.target.value })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => {
                setRecordFilters({ status: '', serial_number: '', from_cabinet_id: '', to_cabinet_id: '', date_from: '', date_to: '' });
                setPage(1);
              }}>重置</button>
            </div>
          </div>

          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>调拨单号</th>
                    <th>手环编号</th>
                    <th>批次</th>
                    <th>颜色</th>
                    <th>原柜位 / 负责人</th>
                    <th>目标柜位 / 负责人</th>
                    <th>调拨原因</th>
                    <th>状态</th>
                    <th>创建人</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {transferRecords.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.transfer_code}</td>
                      <td style={{ fontFamily: 'monospace' }}>{t.serial_number}</td>
                      <td>{t.batch_code || '-'}</td>
                      <td>
                        {t.color && (
                          <span className="color-tag">
                            <span className="color-dot" style={{ background: getColorHex(t.color) }}></span>
                            {t.color}
                          </span>
                        )}
                      </td>
                      <td>
                        <div>{t.from_cabinet_code || '-'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{t.from_responsible_person_name || '-'}</div>
                      </td>
                      <td>
                        <div>{t.to_cabinet_code || '-'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{t.to_responsible_person_name || '-'}</div>
                      </td>
                      <td style={{ maxWidth: 150 }}>
                        <span title={t.transfer_reason}>{t.transfer_reason || '-'}</span>
                      </td>
                      <td>{getStatusBadge(t.status)}</td>
                      <td>
                        <div>{t.creator_name || '-'}</div>
                        {t.confirmer_name && (
                          <div style={{ fontSize: 12, color: 'var(--text-light)' }}>确认: {t.confirmer_name}</div>
                        )}
                      </td>
                      <td>
                        <div>{dayjs(t.created_at).format('MM-DD HH:mm')}</div>
                        {t.confirmed_at && (
                          <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{dayjs(t.confirmed_at).format('MM-DD HH:mm')}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => setTimelineSerial(t.serial_number)}>
                            📋 记录
                          </button>
                          {t.status === '待确认' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm btn-success" onClick={() => handleConfirmTransfer(t.id)}>确认</button>
                              <button className="btn btn-sm btn-secondary" onClick={() => handleCancelTransfer(t.id)}>取消</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transferRecords.length === 0 && (
                    <tr><td colSpan="11" className="empty"><div className="empty-icon">📋</div>暂无调拨记录</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <div className="page-info">共 {totalRecords} 条，第 {page} / {totalPages || 1} 页</div>
              <div className="page-buttons">
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>上一页</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = Math.max(1, Math.min(page - 2 + i, totalPages));
                  return <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
                })}
                <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages || 1, p + 1))}>下一页</button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'create' && (
        <>
          <div className="filter-bar" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>手环编号</label>
              <input placeholder="输入编号搜索" value={wristbandFilters.serial_number} onChange={e => setWristbandFilters({ ...wristbandFilters, serial_number: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>批次</label>
              <select value={wristbandFilters.batch_id} onChange={e => setWristbandFilters({ ...wristbandFilters, batch_id: e.target.value })}>
                <option value="">全部</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>颜色</label>
              <select value={wristbandFilters.color} onChange={e => setWristbandFilters({ ...wristbandFilters, color: e.target.value })}>
                <option value="">全部</option>
                {colors.map(c => <option key={c.id} value={c.color}>{c.color}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>当前柜位</label>
              <select value={wristbandFilters.cabinet_id} onChange={e => setWristbandFilters({ ...wristbandFilters, cabinet_id: e.target.value })}>
                <option value="">全部</option>
                {cabinets.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => {
                setWristbandFilters({ serial_number: '', batch_id: '', color: '', cabinet_id: '' });
              }}>重置</button>
            </div>
          </div>

          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
              已选择 <span className="badge badge-blue">{selectedWristbandIds.length}</span> / {transferableWristbands.length} 个可调拨手环（仅显示"待发放"状态）
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary btn-sm" onClick={toggleSelectAll}>
                {selectedWristbandIds.length === transferableWristbands.length && transferableWristbands.length > 0 ? '取消全选' : '全选'}
              </button>
              <button className="btn" onClick={handleOpenCreateModal} disabled={selectedWristbandIds.length === 0}>
                🔄 创建调拨单
              </button>
            </div>
          </div>

          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>
                      <input
                        type="checkbox"
                        style={{ width: 'auto' }}
                        checked={selectedWristbandIds.length === transferableWristbands.length && transferableWristbands.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>手环编号</th>
                    <th>批次</th>
                    <th>颜色</th>
                    <th>当前柜位</th>
                    <th>负责人</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {transferableWristbands.map(w => (
                    <tr key={w.id} style={selectedWristbandIds.includes(w.id) ? { background: '#eff6ff' } : {}}>
                      <td>
                        <input
                          type="checkbox"
                          style={{ width: 'auto' }}
                          checked={selectedWristbandIds.includes(w.id)}
                          onChange={() => toggleSelectWristband(w.id)}
                        />
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{w.serial_number}</td>
                      <td>{w.batch_code || '-'}</td>
                      <td>
                        <span className="color-tag">
                          <span className="color-dot" style={{ background: getColorHex(w.color) }}></span>
                          {w.color}
                        </span>
                      </td>
                      <td>{w.cabinet_code || '-'}</td>
                      <td>{w.responsible_person_name || '-'}</td>
                      <td>
                        <span className="badge status-待发放">待发放</span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); setTimelineSerial(w.serial_number); }}>
                          📋 记录
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transferableWristbands.length === 0 && (
                    <tr><td colSpan="8" className="empty"><div className="empty-icon">🎟️</div>暂无可调拨的手环（仅显示"待发放"状态）</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>创建调拨单（{selectedWristbandIds.length} 个手环）</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateTransfer}>
              <div className="modal-body">
                <div className="alert alert-info">
                  ℹ️ 调拨单创建后状态为"待确认"，需在调拨记录中手动确认后才会更新手环所属柜位和负责人。
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>目标柜位 <span className="required">*</span></label>
                    <select value={transferForm.to_cabinet_id} onChange={e => setTransferForm({ ...transferForm, to_cabinet_id: e.target.value })}>
                      <option value="">请选择目标柜位</option>
                      {cabinets.map(c => <option key={c.id} value={c.id}>{c.code} ({c.location})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>目标负责人 <span className="required">*</span></label>
                    <select value={transferForm.to_responsible_person_id} onChange={e => setTransferForm({ ...transferForm, to_responsible_person_id: e.target.value })}>
                      <option value="">请选择目标负责人</option>
                      {persons.map(p => <option key={p.id} value={p.id}>{p.name} ({p.department || '-'})</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>调拨原因</label>
                  <select value={transferForm.transfer_reason} onChange={e => setTransferForm({ ...transferForm, transfer_reason: e.target.value })}>
                    <option value="">请选择或在备注中自定义</option>
                    <option value="柜位调整">柜位调整</option>
                    <option value="人员交接">人员交接</option>
                    <option value="活动调配">活动调配</option>
                    <option value="库存平衡">库存平衡</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>备注</label>
                  <textarea value={transferForm.remark} onChange={e => setTransferForm({ ...transferForm, remark: e.target.value })} placeholder="可填写调拨详情说明..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>取消</button>
                <button type="submit" className="btn">创建调拨单</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {timelineSerial && (
        <WristbandTimeline
          serialNumber={timelineSerial}
          onClose={() => setTimelineSerial(null)}
        />
      )}
    </div>
  );
}
