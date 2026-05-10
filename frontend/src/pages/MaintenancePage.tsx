import React, { useEffect, useState, useCallback } from 'react';
import { maintenanceApi, shipsApi, usersApi } from '../services/api';
import { MaintenanceTask, Ship, User, TaskStatus, Priority } from '../types';
import { useAuth } from '../contexts/AuthContext';

const STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function statusBadge(status: string, isOverdue?: boolean) {
  if (isOverdue && status !== 'COMPLETED') return <span className="badge badge-overdue">OVERDUE</span>;
  if (status === 'PENDING') return <span className="badge badge-pending">Pending</span>;
  if (status === 'IN_PROGRESS') return <span className="badge badge-in-progress">In Progress</span>;
  return <span className="badge badge-completed">Completed</span>;
}

function priorityBadge(p: string) {
  const cls = p === 'CRITICAL' ? 'badge-critical' : p === 'HIGH' ? 'badge-high' : p === 'MEDIUM' ? 'badge-medium' : 'badge-low';
  return <span className={`badge ${cls}`}>{p}</span>;
}

interface TaskModalProps {
  task?: MaintenanceTask | null;
  ships: Ship[];
  crew: User[];
  onClose: () => void;
  onSave: () => void;
}

function TaskModal({ task, ships, crew, onClose, onSave }: TaskModalProps) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    shipId: task?.shipId || '',
    assignedToId: task?.assignedToId || '',
    dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
    priority: task?.priority || 'MEDIUM',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title || !form.description || !form.shipId || !form.dueDate) {
      setError('All required fields must be filled');
      return;
    }
    setSaving(true);
    try {
      if (task) {
        await maintenanceApi.update(task.id, { ...form, assignedToId: form.assignedToId || undefined });
      } else {
        await maintenanceApi.create({ ...form, assignedToId: form.assignedToId || undefined });
      }
      onSave();
    } catch {
      setError('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{task ? 'Edit Task' : 'New Maintenance Task'}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title" />
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Detailed description..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ship *</label>
              <select className="form-control" value={form.shipId} onChange={e => set('shipId', e.target.value)}>
                <option value="">Select ship...</option>
                {ships.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assign To</label>
              <select className="form-control" value={form.assignedToId} onChange={e => set('assignedToId', e.target.value)}>
                <option value="">Unassigned</option>
                {crew.filter(c => !form.shipId || c.shipId === form.shipId).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Due Date *</label>
              <input type="date" className="form-control" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-control" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DetailModalProps {
  task: MaintenanceTask;
  onClose: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
}

function DetailModal({ task, onClose, onRefresh, isAdmin }: DetailModalProps) {
  const { user } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleStatus = async (status: TaskStatus) => {
    setUpdating(true);
    try {
      await maintenanceApi.update(task.id, { status });
      onRefresh();
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await maintenanceApi.addNote(task.id, newNote);
      setNewNote('');
      onRefresh();
    } finally {
      setAddingNote(false);
    }
  };

  const canEdit = isAdmin || task.assignedToId === user?.id;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{task.title}</div>
            <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
              {statusBadge(task.status, task.isOverdue)}
              {priorityBadge(task.priority)}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ color: 'var(--gray-600)', marginBottom: 16, fontSize: 14 }}>{task.description}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20, padding: '12px', background: 'var(--gray-50)', borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Ship</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{task.ship.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Assigned To</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{task.assignedTo?.name || 'Unassigned'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Due Date</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: task.isOverdue ? 'var(--danger)' : 'inherit' }}>
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            </div>
          </div>

          {canEdit && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--gray-700)' }}>Update Status</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {STATUSES.map(s => (
                  <button
                    key={s}
                    className={`btn btn-sm ${task.status === s ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleStatus(s)}
                    disabled={updating || task.status === s}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--gray-700)' }}>
              Notes & Comments ({task.notes?.length || 0})
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
              {(task.notes || []).length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--gray-400)', padding: '8px 0' }}>No notes yet</div>
              )}
              {(task.notes || []).map(note => (
                <div key={note.id} style={{ padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 6, marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 2 }}>
                    {note.user.name} · {new Date(note.createdAt).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13 }}>{note.note}</div>
                </div>
              ))}
            </div>
            {canEdit && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-control"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                />
                <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                  Add
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [crew, setCrew] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<MaintenanceTask | null>(null);
  const [detailTask, setDetailTask] = useState<MaintenanceTask | null>(null);
  const [filterShip, setFilterShip] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s, c] = await Promise.all([
        maintenanceApi.list({ shipId: filterShip || undefined, status: filterStatus || undefined, priority: filterPriority || undefined }),
        shipsApi.list(),
        usersApi.crew(),
      ]);
      setTasks(t.data);
      setShips(s.data);
      setCrew(c.data);
    } finally {
      setLoading(false);
    }
  }, [filterShip, filterStatus, filterPriority]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    await maintenanceApi.delete(id);
    load();
  };

  const refreshDetail = async () => {
    if (detailTask) {
      const { data } = await maintenanceApi.get(detailTask.id);
      setDetailTask(data);
    }
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Maintenance Tasks</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 4 }}>
            {isAdmin ? 'Manage and assign maintenance tasks across the fleet' : 'Your assigned maintenance tasks'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Task
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
            <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="">All Priority</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {(filterShip || filterStatus || filterPriority) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setFilterShip(''); setFilterStatus(''); setFilterPriority(''); }}>
                Clear
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--gray-400)' }}>{tasks.length} tasks</span>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No maintenance tasks found</div>
            <p style={{ fontSize: 13 }}>
              {isAdmin ? 'Create the first maintenance task to get started.' : 'No tasks assigned to you yet.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Ship</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} className={task.isOverdue ? 'row-overdue' : ''}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                        {task.notes?.length || 0} notes
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{task.ship.name}</td>
                    <td style={{ fontSize: 13 }}>{task.assignedTo?.name || <span style={{ color: 'var(--gray-400)' }}>Unassigned</span>}</td>
                    <td>{priorityBadge(task.priority)}</td>
                    <td>{statusBadge(task.status, task.isOverdue)}</td>
                    <td style={{ fontSize: 12, color: task.isOverdue ? 'var(--danger)' : 'var(--gray-500)' }}>
                      {new Date(task.dueDate).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setDetailTask(task)}>View</button>
                        {isAdmin && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditTask(task)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(task.id)}>Del</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showCreate || editTask) && (
        <TaskModal
          task={editTask}
          ships={ships}
          crew={crew}
          onClose={() => { setShowCreate(false); setEditTask(null); }}
          onSave={() => { setShowCreate(false); setEditTask(null); load(); }}
        />
      )}

      {detailTask && (
        <DetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onRefresh={refreshDetail}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
