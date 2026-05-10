import React, { useEffect, useState, useCallback } from 'react';
import { shipsApi } from '../services/api';
import { Ship } from '../types';

interface ShipModalProps {
  ship?: Ship | null;
  onClose: () => void;
  onSave: () => void;
}

function ShipModal({ ship, onClose, onSave }: ShipModalProps) {
  const [form, setForm] = useState({
    name: ship?.name || '',
    imoNumber: ship?.imoNumber || '',
    type: ship?.type || '',
    flag: ship?.flag || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.imoNumber || !form.type) {
      setError('Name, IMO number and type are required');
      return;
    }
    setSaving(true);
    try {
      if (ship) {
        await shipsApi.update(ship.id, { name: form.name, type: form.type, flag: form.flag });
      } else {
        await shipsApi.create(form);
      }
      onSave();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error || 'Failed to save ship');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{ship ? 'Edit Ship' : 'Add New Ship'}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ship Name *</label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="MV Ocean Pioneer" />
            </div>
            <div className="form-group">
              <label className="form-label">IMO Number *</label>
              <input className="form-control" value={form.imoNumber} onChange={e => set('imoNumber', e.target.value)} placeholder="9876543" disabled={!!ship} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vessel Type *</label>
              <select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="">Select type...</option>
                {['Cargo', 'Tanker', 'Container', 'Bulk Carrier', 'Research', 'Passenger', 'Fishing', 'Offshore', 'Tug'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Flag State</label>
              <input className="form-control" value={form.flag} onChange={e => set('flag', e.target.value)} placeholder="Panama" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : ship ? 'Update Ship' : 'Add Ship'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShipsPage() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editShip, setEditShip] = useState<Ship | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await shipsApi.list();
    setShips(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this ship? All associated tasks and drills will also be deleted.')) return;
    await shipsApi.delete(id);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Fleet Management</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 4 }}>Manage vessels in the fleet</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Ship</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {ships.map(ship => (
            <div key={ship.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{ship.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>IMO: {ship.imoNumber}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditShip(ship)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ship.id)}>Del</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ background: 'var(--gray-50)', padding: '8px', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Type</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{ship.type}</div>
                </div>
                <div style={{ background: 'var(--gray-50)', padding: '8px', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Flag</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{ship.flag}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--gray-100)', paddingTop: 12, fontSize: 12, color: 'var(--gray-500)' }}>
                <span>👥 {ship._count?.crew || 0} crew</span>
                <span>🔧 {ship._count?.maintenanceTasks || 0} tasks</span>
                <span>🛡 {ship._count?.safetyDrills || 0} drills</span>
              </div>
            </div>
          ))}

          {ships.length === 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <div className="empty-state"><div className="empty-state-title">No ships registered</div></div>
            </div>
          )}
        </div>
      )}

      {(showCreate || editShip) && (
        <ShipModal
          ship={editShip}
          onClose={() => { setShowCreate(false); setEditShip(null); }}
          onSave={() => { setShowCreate(false); setEditShip(null); load(); }}
        />
      )}
    </div>
  );
}
