import { useState, useEffect } from 'react';
import { wristbandAPI } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import dayjs from 'dayjs';

const EVENT_TYPE_CONFIG = {
  '导入': { icon: '📥', color: 'var(--info)', bgColor: '#cffafe' },
  '发放': { icon: '🎫', color: 'var(--primary)', bgColor: '#dbeafe' },
  '归还提交': { icon: '♻️', color: 'var(--warning)', bgColor: '#fef9c3' },
  '归还确认': { icon: '✅', color: 'var(--success)', bgColor: '#dcfce7' },
  '异常上报': { icon: '⚠️', color: 'var(--danger)', bgColor: '#fee2e2' },
  '异常处理': { icon: '🔧', color: 'var(--orange)', bgColor: '#ffedd5' },
  '调拨创建': { icon: '📦', color: 'var(--purple)', bgColor: '#f3e8ff' },
  '调拨确认': { icon: '✅', color: 'var(--success)', bgColor: '#dcfce7' },
  '调拨取消': { icon: '❌', color: 'var(--text-light)', bgColor: '#f3f4f6' },
};

export default function WristbandTimeline({ serialNumber, onClose }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [timelineData, setTimelineData] = useState(null);

  useEffect(() => {
    if (serialNumber) {
      loadTimeline();
    }
  }, [serialNumber]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const res = await wristbandAPI.getTimeline(serialNumber);
      setTimelineData(res.data);
    } catch (e) {
      showToast(e.response?.data?.detail || '加载时间线失败', 'error');
    } finally {
      setLoading(false);
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

  const getEventConfig = (type) => {
    return EVENT_TYPE_CONFIG[type] || { icon: '📌', color: 'var(--text-light)', bgColor: '#f3f4f6' };
  };

  if (!onClose) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal timeline-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔄 手环全流程记录</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading && <div className="empty"><div className="empty-icon">⏳</div>加载中...</div>}

          {!loading && timelineData && (
            <>
              <div className="timeline-wristband-info">
                <div className="timeline-info-header">
                  <span className="timeline-serial">{timelineData.wristband.serial_number}</span>
                  {getStatusBadge(timelineData.wristband.status)}
                  {timelineData.wristband.is_overdue && (
                    <span className={`badge ${timelineData.wristband.days_overdue > 7 ? 'badge-red' : 'badge-orange'}`}>
                      逾期{timelineData.wristband.days_overdue}天
                    </span>
                  )}
                </div>
                <div className="timeline-info-grid">
                  <div>
                    <span className="label">批次：</span>
                    <span>{timelineData.wristband.batch_code || '-'}</span>
                  </div>
                  <div>
                    <span className="label">颜色：</span>
                    <span>{timelineData.wristband.color || '-'}</span>
                  </div>
                  <div>
                    <span className="label">柜位：</span>
                    <span>{timelineData.wristband.cabinet_code || '-'}</span>
                  </div>
                  <div>
                    <span className="label">责任人：</span>
                    <span>{timelineData.wristband.responsible_person_name || '-'}</span>
                  </div>
                  {timelineData.wristband.recipient_name && (
                    <>
                      <div>
                        <span className="label">领取人：</span>
                        <span>{timelineData.wristband.recipient_name}</span>
                      </div>
                      <div>
                        <span className="label">联系电话：</span>
                        <span>{timelineData.wristband.recipient_phone || '-'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="timeline-list">
                {timelineData.timeline.map((event, index) => {
                  const config = getEventConfig(event.event_type);
                  const isLast = index === timelineData.timeline.length - 1;
                  return (
                    <div key={index} className={`timeline-item ${isLast ? 'last' : ''}`}>
                      <div className="timeline-dot" style={{ background: config.color }}>
                        <span className="timeline-icon">{config.icon}</span>
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-event-header">
                          <span className="timeline-event-type" style={{ color: config.color, background: config.bgColor }}>
                            {event.event_type}
                          </span>
                          <span className="timeline-time">
                            {dayjs(event.event_time).format('YYYY-MM-DD HH:mm:ss')}
                          </span>
                        </div>
                        {event.operator_name && (
                          <div className="timeline-detail">
                            <span className="label">操作人：</span>
                            {event.operator_name}
                          </div>
                        )}
                        {event.recipient_name && (
                          <div className="timeline-detail">
                            <span className="label">接收人：</span>
                            {event.recipient_name}
                            {event.recipient_phone && ` (${event.recipient_phone})`}
                          </div>
                        )}
                        {event.cabinet_info && (
                          <div className="timeline-detail">
                            <span className="label">柜位：</span>
                            {event.cabinet_info}
                          </div>
                        )}
                        {event.responsible_person && (
                          <div className="timeline-detail">
                            <span className="label">负责人：</span>
                            {event.responsible_person}
                          </div>
                        )}
                        {event.remark && (
                          <div className="timeline-detail timeline-remark">
                            <span className="label">备注：</span>
                            {event.remark}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {timelineData.timeline.length === 0 && (
                  <div className="empty">
                    <div className="empty-icon">📋</div>
                    暂无流程记录
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
