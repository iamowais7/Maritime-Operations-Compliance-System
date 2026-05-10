import React, { useEffect, useState } from 'react';
import { complianceApi, shipsApi } from '../services/api';
import { ComplianceSummary, ShipCompliance, TrendPoint, Ship } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

function ComplianceBar({ value, label }: { value: number; label: string }) {
  const bar = value >= 80 ? 'progress-green' : value >= 60 ? 'progress-yellow' : 'progress-red';
  const color = value >= 80 ? 'var(--success)' : value >= 60 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
        <span style={{ color: 'var(--gray-600)' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}%</span>
      </div>
      <div className="progress-bar"><div className={`progress-fill ${bar}`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function RiskPill({ level }: { level: string }) {
  const style: Record<string, string> = {
    LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high'
  };
  return <span className={`badge ${style[level] || 'badge-medium'}`}>{level}</span>;
}

export default function CompliancePage() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [shipCompliance, setShipCompliance] = useState<ShipCompliance[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [filterShip, setFilterShip] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (shipId?: string) => {
    setLoading(true);
    try {
      const [s, sc, t, sh] = await Promise.all([
        complianceApi.summary(shipId),
        complianceApi.ships(),
        complianceApi.trend(shipId),
        shipsApi.list(),
      ]);
      setSummary(s.data);
      setShipCompliance(sc.data);
      setTrend(t.data);
      setShips(sh.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleShipFilter = (shipId: string) => {
    setFilterShip(shipId);
    load(shipId || undefined);
  };

  const radarData = summary ? [
    { subject: 'Maintenance', value: summary.maintenance.complianceRate, fullMark: 100 },
    { subject: 'Drills', value: summary.drills.complianceRate, fullMark: 100 },
    { subject: 'On-Time', value: summary.maintenance.total > 0 ? Math.round(((summary.maintenance.total - summary.maintenance.overdue) / summary.maintenance.total) * 100) : 100, fullMark: 100 },
    { subject: 'Participation', value: summary.drills.past > 0 ? Math.round((summary.drills.completed / summary.drills.past) * 100) : 100, fullMark: 100 },
  ] : [];

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!summary) return null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Compliance Dashboard</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 4 }}>
            Fleet compliance monitoring and risk assessment
          </p>
        </div>
        <select className="filter-select" value={filterShip} onChange={e => handleShipFilter(e.target.value)}>
          <option value="">All Ships (Fleet)</option>
          {ships.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: summary.overall.complianceRate >= 80 ? '#e8f5e9' : summary.overall.complianceRate >= 60 ? '#fff8e1' : '#ffebee' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={summary.overall.complianceRate >= 80 ? '#2e7d32' : summary.overall.complianceRate >= 60 ? '#f57f17' : '#c62828'} strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: summary.overall.complianceRate >= 80 ? 'var(--success)' : summary.overall.complianceRate >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
              {summary.overall.complianceRate}%
            </div>
            <div className="stat-label">Overall Compliance</div>
            <RiskPill level={summary.overall.riskLevel} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ffebee' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: summary.maintenance.overdue > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {summary.maintenance.overdue}
            </div>
            <div className="stat-label">Overdue Tasks</div>
            <div className="stat-sub">{summary.maintenance.pending} pending</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff3e0' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: summary.drills.missed > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {summary.drills.missed}
            </div>
            <div className="stat-label">Missed Drills</div>
            <div className="stat-sub">{summary.drills.upcoming} upcoming</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e8f5e9' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{summary.maintenance.completed + summary.drills.completed}</div>
            <div className="stat-label">Total Completed</div>
            <div className="stat-sub">Tasks + Drills</div>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Compliance Breakdown</span></div>
          <div className="card-body">
            <ComplianceBar value={summary.maintenance.complianceRate} label="Maintenance Compliance" />
            <ComplianceBar value={summary.drills.complianceRate} label="Drill Participation Rate" />
            <ComplianceBar value={summary.overall.complianceRate} label="Overall Fleet Compliance" />

            <div style={{ marginTop: 20, borderTop: '1px solid var(--gray-100)', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--gray-700)' }}>Maintenance Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'Completed', value: summary.maintenance.completed, color: 'var(--success)' },
                  { label: 'In Progress', value: summary.maintenance.inProgress, color: 'var(--ocean)' },
                  { label: 'Overdue', value: summary.maintenance.overdue, color: 'var(--danger)' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center', padding: 10, background: 'var(--gray-50)', borderRadius: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Compliance Radar</span></div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" fontSize={12} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                <Radar name="Compliance" dataKey="value" stroke="#1565c0" fill="#1565c0" fillOpacity={0.3} />
                <Tooltip formatter={(v: number) => `${v}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><span className="card-title">6-Month Compliance Trend</span></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <XAxis dataKey="label" fontSize={12} />
              <YAxis domain={[0, 100]} unit="%" fontSize={12} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey="maintenanceRate" name="Maintenance" stroke="#1565c0" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="drillRate" name="Drills" stroke="#00796b" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Per-Ship Compliance</span></div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ship</th>
                <th>IMO</th>
                <th>Maintenance</th>
                <th>Drills</th>
                <th>Overall</th>
                <th>Overdue</th>
                <th>Missed Drills</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {shipCompliance.map(sc => (
                <tr key={sc.shipId}>
                  <td style={{ fontWeight: 500 }}>{sc.shipName}</td>
                  <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{sc.imoNumber}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--gray-200)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${sc.maintenanceCompliance}%`, background: sc.maintenanceCompliance >= 80 ? 'var(--success-light)' : sc.maintenanceCompliance >= 60 ? 'var(--warning-light)' : 'var(--danger-light)', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 32 }}>{sc.maintenanceCompliance}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--gray-200)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${sc.drillCompliance}%`, background: sc.drillCompliance >= 80 ? 'var(--success-light)' : sc.drillCompliance >= 60 ? 'var(--warning-light)' : 'var(--danger-light)', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 32 }}>{sc.drillCompliance}%</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: sc.overallCompliance >= 80 ? 'var(--success)' : sc.overallCompliance >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                    {sc.overallCompliance}%
                  </td>
                  <td style={{ color: sc.overdueTasks > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                    {sc.overdueTasks}
                  </td>
                  <td style={{ color: sc.missedDrills > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                    {sc.missedDrills}
                  </td>
                  <td><RiskPill level={sc.riskLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
