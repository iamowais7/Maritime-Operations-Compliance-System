import React, { useEffect, useState, useCallback } from 'react';
import { usersApi, shipsApi, authApi } from '../services/api';
import { User, Ship } from '../types';

interface UserModalProps {
  user?: User | null;
  ships: Ship[];
  onClose: () => void;
  onSave: () => void;
}

function UserModal({ user, ships, onClose, onSave }: UserModalProps) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'CREW',
    shipId: user?.shipId || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.email) { setError('Name and email are required'); return; }
    if (!user && !form.password) { setError('Password is required for new users'); return; }
    setSaving(true);
    try {
      if (user) {
        await usersApi.update(user.id, {
          name: form.name, email: form.email, role: form.role,
          shipId: form.shipId || null,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await authApi.register({ name: form.name, email: form.email, password: form.password, role: form.role, shipId: form.shipId || undefined });
      }
      onSave();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{user ? 'Edit User' : 'Add Crew Member'}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className="form-control" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{user ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" className="form-control" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="CREW">Crew</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Assigned Ship</label>
            <select className="form-control" value={form.shipId} onChange={e => set('shipId', e.target.value)}>
              <option value="">No ship assigned</option>
              {ships.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : user ? 'Update User' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState('');
  const [filterShip, setFilterShip] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [u, s] = await Promise.all([usersApi.list(), shipsApi.list()]);
    setUsers(u.data);
    setShips(s.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this user?')) return;
    await usersApi.delete(id);
    load();
  };

  const filtered = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterShip && u.shipId !== filterShip) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Crew Members</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 4 }}>Manage user accounts and ship assignments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add User</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ paddingBottom: 12, paddingTop: 12 }}>
          <div className="filters-bar">
            <span style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>Filters:</span>
            <select className="filter-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="CREW">Crew</option>
            </select>
            <select className="filter-select" value={filterShip} onChange={e => setFilterShip(e.target.value)}>
              <option value="">All Ships</option>
              {ships.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--gray-400)' }}>{filtered.length} users</span>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-title">No users found</div></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Ship</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: u.role === 'ADMIN' ? 'var(--ocean)' : 'var(--teal)',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13,
                        }}>
                          {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-crew'}`}>{u.role}</span>
                    </td>
                    <td style={{ fontSize: 13 }}>{u.ship?.name || <span style={{ color: 'var(--gray-400)' }}>—</span>}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditUser(u)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showCreate || editUser) && (
        <UserModal
          user={editUser}
          ships={ships}
          onClose={() => { setShowCreate(false); setEditUser(null); }}
          onSave={() => { setShowCreate(false); setEditUser(null); load(); }}
        />
      )}
    </div>
  );
}
