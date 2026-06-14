import { useState, useEffect } from 'react';
import { batchAPI, colorRuleAPI, cabinetAPI, personAPI, wristbandAPI } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import dayjs from 'dayjs';

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [colors, setColors] = useState([]);
  const [cabinets, setCabinets] = useState([]);
  const [persons, setPersons] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(null);
  const [activeTab, setActiveTab] = useState('batch');
  const [wristbands, setWristbands] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    batch_id: '', color: '', responsible_person_id: '', status: '',
    date_from: '', date_to: '', abnormal_only: false, overdue_only: false, search: ''
  });

  const { showToast } = useToast();

  const [form, setForm] = useState({
    batch_code: '', name: '', color_rule_id: '', cabinet_id: '',
    responsible_person_id: '', total_quantity: 0, event_date: '',
    description: '', status: 'active'
  });

  const [importForm, setImportForm] = useState({
    start_serial: '', count: 100, color: '', cabinet_id: '',
    responsible_person_id: '', expected_return_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'wristband') {
      loadWristbands();
    }
  }, [activeTab, page, filters]);

  const loadData = async () => {
    try {
      const [b, c, cab, p] = await Promise.all([
        batchAPI.list(), colorRuleAPI.list(), cabinetAPI.list(), personAPI.list()
      ]);
      setBatches(b.data);
      setColors(c.data);
      setCabinets(cab.data);
      setPersons(p.data);
    } catch (e) {
      showToast(e.response?.data?.detail || '加载失败', 'error');
    }
  };

  const loadWristbands = async () => {
    try {
      const params = { ...filters, page, page_size: 50 };
      Object.keys(params).forEach(k => {
        if (params[k] === '' || params[k] == null || params[k] === false) delete params[k];
      });
      if (params.abnormal_only === false) delete params.abnormal_only;
      const res = await wristbandAPI.list(params);
      setWristbands(res.data.items);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.batch_code) {
      showToast('请输入批次编号', 'warning');
      return;
    }
    try {
      await batchAPI.create({
        ...form,
        color_rule_id: form.color_rule_id || undefined,
        cabinet_id: form.cabinet_id || undefined,
        responsible_person_id: form.responsible_person_id || undefined,
        event_date: form.event_date || undefined,
      });
      showToast('批次创建成功', 'success');
      setShowCreate(false);
      setForm({ batch_code: '', name: '', color_rule_id: '', cabinet_id: '', responsible_person_id: '', total_quantity: 0, event_date: '', description: '', status: 'active' });
      loadData();
    } catch (e) {
      showToast(e.response?.data?.detail || '创建失败', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除此批次？删除后无法恢复。')) return;
    try {
      await batchAPI.delete(id);
      showToast('删除成功', 'success');
      loadData();
    } catch (e) {
      showToast(e.response?.data?.detail || '删除失败', 'error');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importForm.start_serial || !importForm.color || !importForm.count) {
      showToast('请填写起始编号、颜色和数量', 'warning');
      return;
    }
    try {
      const res = await wristbandAPI.import({
        batch_id: showImport.id,
        start_serial: importForm.start_serial,
        count: Number(importForm.count),
        color: importForm.color,
        cabinet_id: importForm.cabinet_id || undefined,
        responsible_person_id: importForm.responsible_person_id || undefined,
        expected_return_date: importForm.expected_return_date || undefined,
      });
      showToast(`成功导入 ${res.data.imported} 个手环`, 'success');
      setShowImport(null);
      setImportForm({ start_serial: '', count: 100, color: '', cabinet_id: '', responsible_person_id: '', expected_return_date: '' });
      loadData();
    } catch (e) {
      showToast(e.response?.data?.detail || '导入失败', 'error');
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

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <div className="page-header">
        <h1>批次管理</h1>
        <p>管理手环批次信息，批量导入手环数据</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'batch' ? 'active' : ''}`} onClick={() => setActiveTab('batch')}>📦 批次列表</button>
        <button className={`tab ${activeTab === 'wristband' ? 'active' : ''}`} onClick={() => setActiveTab('wristband')}>🎟️ 手环明细</button>
      </div>

      {activeTab === 'batch' && (
        <>
          <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
            <button className="btn" onClick={() => setShowCreate(true)}>+ 新建批次</button>
          </div>

          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>批次编号</th>
                    <th>批次名称</th>
                    <th>指定颜色</th>
                    <th>柜位</th>
                    <th>责任人</th>
                    <th style={{ textAlign: 'center' }}>手环数量</th>
                    <th>活动日期</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{b.batch_code}</td>
                      <td>{b.name || '-'}</td>
                      <td>
                        {b.color_rule ? (
                          <span className="color-tag">
                            <span className="color-dot" style={{ background: b.color_rule.color_hex }}></span>
                            {b.color_rule.color}
                          </span>
                        ) : '-'}
                      </td>
                      <td>{b.cabinet?.code || '-'}</td>
                      <td>{b.responsible_person?.name || '-'}</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-blue">{b.wristband_count || 0}</span></td>
                      <td>{b.event_date || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => setShowImport(b)}>导入手环</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(b.id)}>删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {batches.length === 0 && (
                    <tr><td colSpan="8" className="empty"><div className="empty-icon">📦</div>暂无批次，点击上方按钮新建</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'wristband' && (
        <>
          <div className="filter-bar" style={{ gridTemplateColumns: 'repeat(9, 1fr)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>批次</label>
              <select value={filters.batch_id} onChange={e => setFilters({ ...filters, batch_id: e.target.value })}>
                <option value="">全部</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>颜色</label>
              <select value={filters.color} onChange={e => setFilters({ ...filters, color: e.target.value })}>
                <option value="">全部</option>
                {colors.map(c => <option key={c.id} value={c.color}>{c.color}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>责任人</label>
              <select value={filters.responsible_person_id} onChange={e => setFilters({ ...filters, responsible_person_id: e.target.value })}>
                <option value="">全部</option>
                {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>状态</label>
              <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                <option value="">全部</option>
                <option>待发放</option><option>已发放</option><option>待回收确认</option>
                <option>已回收</option><option>异常观察</option><option>停用</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>开始日期</label>
              <input type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>结束日期</label>
              <input type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>搜索</label>
              <input placeholder="编号/姓名/电话" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, alignSelf: 'center', whiteSpace: 'nowrap' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={filters.abnormal_only} onChange={e => setFilters({ ...filters, abnormal_only: e.target.checked })} />
                仅异常
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, alignSelf: 'center', whiteSpace: 'nowrap' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={filters.overdue_only} onChange={e => setFilters({ ...filters, overdue_only: e.target.checked })} />
                仅逾期
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setFilters({ batch_id: '', color: '', responsible_person_id: '', status: '', date_from: '', date_to: '', abnormal_only: false, overdue_only: false, search: '' }); setPage(1); }}>重置</button>
            </div>
          </div>

          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>手环编号</th>
                    <th>批次</th>
                    <th>颜色</th>
                    <th>状态</th>
                    <th>逾期</th>
                    <th>领取人</th>
                    <th>领取人电话</th>
                    <th>责任人</th>
                    <th>发放时间</th>
                    <th>预计归还</th>
                  </tr>
                </thead>
                <tbody>
                  {wristbands.map(w => (
                    <tr key={w.id} style={w.is_overdue ? { background: '#fff7ed' } : {}}>
                      <td style={{ fontFamily: 'monospace' }}>{w.serial_number}</td>
                      <td>{w.batch_code || '-'}</td>
                      <td>
                        <span className="color-tag">
                          <span className="color-dot" style={{ background: getColorHex(w.color) }}></span>
                          {w.color}
                        </span>
                      </td>
                      <td>{getStatusBadge(w.status)}</td>
                      <td>
                        {w.is_overdue ? (
                          <span className={`badge ${w.days_overdue > 7 ? 'badge-red' : 'badge-orange'}`}>
                            逾期{w.days_overdue}天
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontSize: 12 }}>-</span>
                        )}
                      </td>
                      <td>{w.recipient_name || '-'}</td>
                      <td>{w.recipient_phone || '-'}</td>
                      <td>{w.responsible_person_name || '-'}</td>
                      <td>{w.issued_at ? dayjs(w.issued_at).format('MM-DD HH:mm') : '-'}</td>
                      <td>{w.expected_return_date || '-'}</td>
                    </tr>
                  ))}
                  {wristbands.length === 0 && (
                    <tr><td colSpan="10" className="empty"><div className="empty-icon">🎟️</div>暂无手环数据</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <div className="page-info">共 {total} 条，第 {page} / {totalPages || 1} 页</div>
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

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新建批次</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>批次编号 <span className="required">*</span></label>
                    <input value={form.batch_code} onChange={e => setForm({ ...form, batch_code: e.target.value })} placeholder="如 EVENT-20240614-001" />
                  </div>
                  <div className="form-group">
                    <label>批次名称</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如 XX峰会入场手环" />
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>颜色规则</label>
                    <select value={form.color_rule_id} onChange={e => setForm({ ...form, color_rule_id: e.target.value })}>
                      <option value="">不指定</option>
                      {colors.map(c => <option key={c.id} value={c.id}>{c.color} - {c.meaning || ''}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>存放柜位</label>
                    <select value={form.cabinet_id} onChange={e => setForm({ ...form, cabinet_id: e.target.value })}>
                      <option value="">不指定</option>
                      {cabinets.map(c => <option key={c.id} value={c.id}>{c.code} ({c.location})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>责任人</label>
                    <select value={form.responsible_person_id} onChange={e => setForm({ ...form, responsible_person_id: e.target.value })}>
                      <option value="">不指定</option>
                      {persons.map(p => <option key={p.id} value={p.id}>{p.name} ({p.department || ''})</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>活动日期</label>
                    <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>状态</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="active">启用</option>
                      <option value="inactive">停用</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>说明</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="批次说明、用途备注等"></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>取消</button>
                <button type="submit" className="btn">创建批次</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>导入手环 - {showImport.batch_code}</h3>
              <button className="modal-close" onClick={() => setShowImport(null)}>×</button>
            </div>
            <form onSubmit={handleImport}>
              <div className="modal-body">
                <div className="alert alert-info">
                  ℹ️ 系统将按起始编号自动递增生成连续编号的手环。导入时会校验颜色是否与批次规则匹配。
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>起始编号 <span className="required">*</span></label>
                    <input value={importForm.start_serial} onChange={e => setImportForm({ ...importForm, start_serial: e.target.value })} placeholder="如 WB000001" />
                  </div>
                  <div className="form-group">
                    <label>导入数量 <span className="required">*</span></label>
                    <input type="number" min="1" value={importForm.count} onChange={e => setImportForm({ ...importForm, count: e.target.value })} />
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>颜色 <span className="required">*</span></label>
                    <select value={importForm.color} onChange={e => setImportForm({ ...importForm, color: e.target.value })}>
                      <option value="">请选择</option>
                      {colors.map(c => <option key={c.id} value={c.color}>{c.color} ({c.meaning || ''})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>存放柜位</label>
                    <select value={importForm.cabinet_id} onChange={e => setImportForm({ ...importForm, cabinet_id: e.target.value })}>
                      <option value="">同批次默认</option>
                      {cabinets.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>责任人</label>
                    <select value={importForm.responsible_person_id} onChange={e => setImportForm({ ...importForm, responsible_person_id: e.target.value })}>
                      <option value="">同批次默认</option>
                      {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>预计归还日期</label>
                  <input type="date" value={importForm.expected_return_date} onChange={e => setImportForm({ ...importForm, expected_return_date: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowImport(null)}>取消</button>
                <button type="submit" className="btn btn-success">开始导入</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
