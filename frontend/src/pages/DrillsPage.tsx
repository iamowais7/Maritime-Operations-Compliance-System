import React, { useEffect, useState, useCallback } from 'react';
import { drillsApi, shipsApi } from '../services/api';
import { SafetyDrill, Ship, DrillType } from '../types';
import { useAuth } from '../contexts/AuthContext';

const DRILL_TYPES: DrillType[] = ['FIRE_DRILL', 'EVACUATION', 'MAN_OVERBOARD', 'LIFEBOAT', 'OIL_SPILL', 'EMERGENCY_STEERING', 'ABANDON_SHIP'];

const DRILL_LABELS: Record<DrillType, string> = {
  FIRE_DRILL: 'Fire Drill',
  EVACUATION: 'Evacuation',
  MAN_OVERBOARD: 'Man Overboard',
  LIFEBOAT: 'Lifeboat',
  OIL_SPILL: 'Oil Spill',
  EMERGENCY_STEERING: 'Emergency Steering',
  ABANDON_SHIP: 'Abandon Ship',
};

function drillTypeBadge(type: DrillType) {
  const colors: Record<string, string> = {
    FIRE_DRILL: '#ffebee|#c62828',
    EVACUATION: '#fff3e0|#e65100',
    MAN_OVERBOARD: '#e3f2fd|#1565c0',
    LIFEBOAT: '#e8f5e9|#2e7d32',
    OIL_SPILL: '#fce4ec|#880e4f',
    EMERGENCY_STEERING: '#e8eaf6|#283593',
    ABANDON_SHIP: '#f3e5f5|#6a1b9a',
  };
  const [bg, color] = (colors[type] || '#f5f5f5|#333').split('|');
  return (
    <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {DRILL_LABELS[type] || type}
    </span>
  );
}

interface DrillModalProps {
  drill?: SafetyDrill | null;
  ships: Ship[];
  onClose: () => void;
  onSave: () => void;
}

function DrillModal({ drill, ships, onClose, onSave }: DrillModalProps) {
  const [form, setForm] = useState({
    title: drill?.title || '',
    type: drill?.type || 'FIRE_DRILL',
    shipId: drill?.shipId || '',
    scheduledDate: drill?.scheduledDate ? drill.scheduledDate.slice(0, 16) : '',
    description: drill?.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title || !form.shipId || !form.scheduledDate) {
      setError('Title, ship and scheduled date are required');
      return;
    }
    setSaving(true);
    try {
      if (drill) {
        await drillsApi.update(drill.id, form);
      } else {
        await drillsApi.create(form);
      }
      onSave();
    } catch {
      setError('Failed to save drill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{drill ? 'Edit Drill' : 'Schedule Safety Drill'}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Drill title" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Drill Type</label>
              <select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
                {DRILL_TYPES.map(t => <option key={t} value={t}>{DRILL_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ship *</label>
              <select className="form-control" value={form.shipId} onChange={e => set('shipId', e.target.value)}>
                <option value="">Select ship...</option>
                {ships.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Scheduled Date & Time *</label>
            <input type="datetime-local" className="form-control" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Drill objectives and details..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : drill ? 'Update Drill' : 'Schedule Drill'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AttendanceModalProps {
  drill: SafetyDrill;
  onClose: () => void;
  onSave: () => void;
}

function AttendanceModal({ drill, onClose, onSave }: AttendanceModalProps) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const isPast = new Date(drill.scheduledDate) <= new Date();

  const handleMark = async (attended: boolean) => {
    setSaving(true);
    try {
      await drillsApi.markAttendance(drill.id, attended, notes);
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Mark Attendance — {drill.title}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ padding: '12px', background: 'var(--gray-50)', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
              <strong>Ship:</strong> {drill.ship.name} &nbsp;·&nbsp;
              <strong>Date:</strong> {new Date(drill.scheduledDate).toLocaleString()} &nbsp;·&nbsp;
              <strong>Type:</strong> {DRILL_LABELS[drill.type]}
            </div>
          </div>
          {!isPast && (
            <div className="alert alert-info">
              This drill is scheduled in the future. You can pre-register your attendance.
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-control" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Add any relevant notes..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleMark(false)} disabled={saving}>
            Mark Absent
          </button>
          <button className="btn btn-success" onClick={() => handleMark(true)} disabled={saving}>
            Mark Attended
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DrillsPage() {
  const { isAdmin, user } = useAuth();
  const [drills, setDrills] = useState<SafetyDrill[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editDrill, setEditDrill] = useState<SafetyDrill | null>(null);
  const [attendanceDrill, setAttendanceDrill] = useState<SafetyDrill | null>(null);
  const [filterShip, setFilterShip] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterUpcoming, setFilterUpcoming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        drillsApi.list({ shipId: filterShip || undefined, type: filterType || undefined, upcoming: filterUpcoming || undefined }),
        shipsApi.list(),
      ]);
      setDrills(d.data);
      setShips(s.data);
    } finally {
      setLoading(false);
    }
  }, [filterShip, filterType, filterUpcoming]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this drill?')) return;
    await drillsApi.delete(id);
    load();
  };

  const getMyAttendance = (drill: SafetyDrill) => {
    return drill.attendances?.find(a => a.userId === user?.id);
  };

  const now = new Date();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Safety Drills</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 4 }}>
            {isAdmin ? 'Schedule and manage safety drills across the fleet' : 'View and mark your drill attendance'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Schedule Drill
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ paddingBottom: 12, paddingTop: 12 }}>
          <div className="filters-bar">
            <span style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>Filters:</span>
            {isAdmin && (
              <select className="filter-select" value={filterShip} onChange={e => setFilterShip(e.target.value)}>
                <option value="">All Ships</option>
                {ships.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {DRILL_TYPES.map(t => <option key={t} value={t}>{DRILL_LABELS[t]}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={filterUpcoming} onChange={e => setFilterUpcoming(e.target.checked)} />
              Upcoming only
            </label>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--gray-400)' }}>{drills.length} drills</span>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : drills.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No drills found</div>
            <p style={{ fontSize: 13 }}>{isAdmin ? 'Schedule the first safety drill.' : 'No drills scheduled for your ship.'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Drill</th>
                  <th>Type</th>
                  <th>Ship</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  {!isAdmin && <th>My Attendance</th>}
                  {isAdmin && <th>Attendance</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drills.map(drill => {
                  const isPast = new Date(drill.scheduledDate) <= now;
                  const myAtt = getMyAttendance(drill);
                  return (
                    <tr key={drill.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{drill.title}</div>
                        {drill.description && (
                          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{drill.description.slice(0, 60)}{drill.description.length > 60 ? '...' : ''}</div>
                        )}
                      </td>
                      <td>{drillTypeBadge(drill.type)}</td>
                      <td style={{ fontSize: 13 }}>{drill.ship.name}</td>
                      <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        {new Date(drill.scheduledDate).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        {!isPast ? (
                          <span className="badge badge-pending">Upcoming</span>
                        ) : drill.isMissed ? (
                          <span className="badge badge-overdue">Missed</span>
                        ) : (
                          <span className="badge badge-completed">Conducted</span>
                        )}
                      </td>
                      {!isAdmin && (
                        <td>
                          {myAtt ? (
                            myAtt.attended
                              ? <span className="badge badge-completed">Attended</span>
                              : <span className="badge badge-overdue">Absent</span>
                          ) : (
                            <span className="badge badge-pending">Not Marked</span>
                          )}
                        </td>
                      )}
                      {isAdmin && (
                        <td style={{ fontSize: 13 }}>
                          {drill.totalAttended || 0}/{drill.totalCrew || 0} attended
                        </td>
                      )}
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {!isAdmin && (
                            <button className="btn btn-primary btn-sm" onClick={() => setAttendanceDrill(drill)}>
                              Mark
                            </button>
                          )}
                          {isAdmin && (
                            <>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditDrill(drill)}>Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(drill.id)}>Del</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showCreate || editDrill) && (
        <DrillModal
          drill={editDrill}
          ships={ships}
          onClose={() => { setShowCreate(false); setEditDrill(null); }}
          onSave={() => { setShowCreate(false); setEditDrill(null); load(); }}
        />
      )}

      {attendanceDrill && (
        <AttendanceModal
          drill={attendanceDrill}
          onClose={() => setAttendanceDrill(null)}
          onSave={() => { setAttendanceDrill(null); load(); }}
        />
      )}
    </div>
  );
}
