import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { complianceApi, maintenanceApi, drillsApi } from '../services/api';
import { ComplianceSummary, MaintenanceTask, SafetyDrill } from '../types';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

function RiskBadge({ level }: { level: string }) {
  const cls = level === 'LOW' ? 'badge badge-low' : level === 'MEDIUM' ? 'badge badge-medium' : 'badge badge-high';
  return <span className={cls}>{level} RISK</span>;
}

function ComplianceMeter({ value, label }: { value: number; label: string }) {
  const cls = value >= 80 ? 'gauge-green' : value >= 60 ? 'gauge-yellow' : 'gauge-red';
  const bar = value >= 80 ? 'progress-green' : value >= 60 ? 'progress-yellow' : 'progress-red';
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
        <span style={{ color: 'var(--gray-600)' }}>{label}</span>
        <span className={`gauge-value ${cls}`} style={{ fontSize: 16, fontWeight: 700 }}>{value}%</span>
      </div>
      <div className="progress-bar">
        <div className={`progress-fill ${bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336'];

export default function DashboardPage() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [overdueTasks, setOverdueTasks] = useState<MaintenanceTask[]>([]);
  const [upcomingDrills, setUpcomingDrills] = useState<SafetyDrill[]>([]);
  const [trend, setTrend] = useState<{ label: string; maintenanceRate: number; drillRate: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      complianceApi.summary(),
      maintenanceApi.overdue(),
      drillsApi.list({ upcoming: true }),
      complianceApi.trend(),
    ]).then(([s, o, u, t]) => {
      setSummary(s.data);
      setOverdueTasks(o.data.slice(0, 5));
      setUpcomingDrills(u.data.slice(0, 5));
      setTrend(t.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!summary) return null;

  const pieData = [
    { name: 'Completed', value: summary.maintenance.completed },
    { name: 'In Progress', value: summary.maintenance.inProgress },
    { name: 'Pending', value: summary.maintenance.pending },
    { name: 'Overdue', value: summary.maintenance.overdue },
  ].filter(d => d.value > 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Operations Dashboard</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 4 }}>
          Fleet-wide maintenance and safety compliance overview
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e3f2fd' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <div>
            <div className="stat-value">{summary.maintenance.total}</div>
            <div className="stat-label">Total Tasks</div>
            <div className="stat-sub">{summary.maintenance.overdue} overdue</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e8f5e9' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div className="stat-value">{summary.maintenance.completed}</div>
            <div className="stat-label">Tasks Completed</div>
            <div className="stat-sub">{summary.maintenance.complianceRate}% rate</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff3e0' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <div className="stat-value">{summary.drills.total}</div>
            <div className="stat-label">Safety Drills</div>
            <div className="stat-sub">{summary.drills.upcoming} upcoming</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: summary.overall.complianceRate >= 80 ? '#e8f5e9' : summary.overall.complianceRate >= 60 ? '#fff8e1' : '#ffebee' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={summary.overall.complianceRate >= 80 ? '#2e7d32' : summary.overall.complianceRate >= 60 ? '#f57f17' : '#c62828'} strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{summary.overall.complianceRate}%</div>
            <div className="stat-label">Overall Compliance</div>
            <div><RiskBadge level={summary.overall.riskLevel} /></div>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Compliance Rates</span>
          </div>
          <div className="card-body">
            <ComplianceMeter value={summary.maintenance.complianceRate} label="Maintenance Compliance" />
            <ComplianceMeter value={summary.drills.complianceRate} label="Drill Participation" />
            <ComplianceMeter value={summary.overall.complianceRate} label="Overall Compliance" />
            <div style={{ marginTop: 16, padding: '12px', borderRadius: 8, background: summary.overall.isCompliant ? '#e8f5e9' : '#ffebee' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: summary.overall.isCompliant ? 'var(--success)' : 'var(--danger)' }}>
                {summary.overall.isCompliant ? '✓ Fleet is Compliant' : '⚠ Fleet is Non-Compliant'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                Target: ≥ 80% compliance required
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Task Status Breakdown</span></div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No tasks yet</div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><span className="card-title">6-Month Compliance Trend</span></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <XAxis dataKey="label" fontSize={12} />
              <YAxis domain={[0, 100]} unit="%" fontSize={12} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
              <Bar dataKey="maintenanceRate" name="Maintenance" fill="#1565c0" radius={[3, 3, 0, 0]} />
              <Bar dataKey="drillRate" name="Drills" fill="#00796b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Overdue Tasks</span>
            <Link to="/maintenance" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {overdueTasks.length === 0 ? (
            <div className="empty-state"><div className="empty-state-title">No overdue tasks</div></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Task</th><th>Ship</th><th>Due Date</th></tr></thead>
                <tbody>
                  {overdueTasks.map(t => (
                    <tr key={t.id} className="row-overdue">
                      <td style={{ fontWeight: 500 }}>{t.title}</td>
                      <td>{t.ship.name}</td>
                      <td style={{ color: 'var(--danger)', fontSize: 12 }}>
                        {new Date(t.dueDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming Drills</span>
            <Link to="/drills" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {upcomingDrills.length === 0 ? (
            <div className="empty-state"><div className="empty-state-title">No upcoming drills</div></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Drill</th><th>Ship</th><th>Date</th></tr></thead>
                <tbody>
                  {upcomingDrills.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 500 }}>{d.title}</td>
                      <td>{d.ship.name}</td>
                      <td style={{ fontSize: 12 }}>{new Date(d.scheduledDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
