import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { maintenanceApi, drillsApi, complianceApi } from '../services/api';
import { MaintenanceTask, SafetyDrill, ComplianceSummary } from '../types';
import { useAuth } from '../contexts/AuthContext';

function statusBadge(status: string, isOverdue?: boolean) {
  if (isOverdue && status !== 'COMPLETED') return <span className="badge badge-overdue">OVERDUE</span>;
  if (status === 'PENDING') return <span className="badge badge-pending">Pending</span>;
  if (status === 'IN_PROGRESS') return <span className="badge badge-in-progress">In Progress</span>;
  return <span className="badge badge-completed">Completed</span>;
}

export default function CrewDashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [drills, setDrills] = useState<SafetyDrill[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      maintenanceApi.list(),
      drillsApi.list(),
      complianceApi.summary(),
    ]).then(([t, d, s]) => {
      setTasks(t.data);
      setDrills(d.data);
      setSummary(s.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const myOpenTasks = tasks.filter(t => t.status !== 'COMPLETED');
  const myOverdue = tasks.filter(t => t.isOverdue);
  const upcomingDrills = drills.filter(d => new Date(d.scheduledDate) > new Date());
  const myAttendance = drills.filter(d => {
    const a = d.attendances?.find(a => a.userId === user?.id);
    return a?.attended;
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 4 }}>
          {user?.ship ? `Assigned to ${user.ship.name}` : 'No ship assigned'} · Your personal dashboard
        </p>
      </div>

      {myOverdue.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <strong>{myOverdue.length} overdue task{myOverdue.length > 1 ? 's' : ''}!</strong>
            {' '}These tasks require immediate attention.
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e3f2fd' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <div>
            <div className="stat-value">{tasks.length}</div>
            <div className="stat-label">My Tasks</div>
            <div className="stat-sub">{myOpenTasks.length} open</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ffebee' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div className="stat-value" style={{ color: myOverdue.length > 0 ? 'var(--danger)' : 'inherit' }}>{myOverdue.length}</div>
            <div className="stat-label">Overdue Tasks</div>
            <div className="stat-sub">Need immediate action</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff3e0' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <div className="stat-value">{upcomingDrills.length}</div>
            <div className="stat-label">Upcoming Drills</div>
            <div className="stat-sub">{drills.length} total</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e8f5e9' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div className="stat-value">{myAttendance.length}</div>
            <div className="stat-label">Drills Attended</div>
            <div className="stat-sub">
              {summary ? `${summary.drills.complianceRate}% rate` : '—'}
            </div>
          </div>
        </div>
      </div>

      {summary && (
        <div className="card" style={{ marginBottom: 24, marginTop: 8 }}>
          <div className="card-header"><span className="card-title">My Compliance Status</span></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
              {[
                { label: 'Maintenance Compliance', value: summary.maintenance.complianceRate },
                { label: 'Drill Participation', value: summary.drills.complianceRate },
                { label: 'Overall', value: summary.overall.complianceRate },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: item.value >= 80 ? 'var(--success)' : item.value >= 60 ? 'var(--warning)' : 'var(--danger)',
                  }}>
                    {item.value}%
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>{item.label}</div>
                  <div style={{ marginTop: 8 }}>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${item.value >= 80 ? 'progress-green' : item.value >= 60 ? 'progress-yellow' : 'progress-red'}`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">My Tasks</span>
            <Link to="/maintenance" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {tasks.length === 0 ? (
            <div className="empty-state"><div className="empty-state-title">No tasks assigned</div></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Task</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead>
                <tbody>
                  {tasks.slice(0, 6).map(t => (
                    <tr key={t.id} className={t.isOverdue ? 'row-overdue' : ''}>
                      <td style={{ fontWeight: 500, maxWidth: 180 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{t.ship.name}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                      </td>
                      <td>{statusBadge(t.status, t.isOverdue)}</td>
                      <td style={{ fontSize: 12, color: t.isOverdue ? 'var(--danger)' : 'var(--gray-500)' }}>
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
            <span className="card-title">Safety Drills</span>
            <Link to="/drills" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {drills.length === 0 ? (
            <div className="empty-state"><div className="empty-state-title">No drills scheduled</div></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Drill</th><th>Scheduled</th><th>My Status</th></tr></thead>
                <tbody>
                  {drills.slice(0, 6).map(d => {
                    const myAtt = d.attendances?.find(a => a.userId === user?.id);
                    const isPast = new Date(d.scheduledDate) <= new Date();
                    return (
                      <tr key={d.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{d.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{d.ship.name}</div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                          {new Date(d.scheduledDate).toLocaleDateString()}
                        </td>
                        <td>
                          {!isPast ? (
                            <span className="badge badge-pending">Upcoming</span>
                          ) : myAtt ? (
                            myAtt.attended
                              ? <span className="badge badge-completed">Attended</span>
                              : <span className="badge badge-overdue">Absent</span>
                          ) : (
                            <span className="badge badge-overdue">Not Marked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
