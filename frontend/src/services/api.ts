import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; role?: string; shipId?: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const shipsApi = {
  list: () => api.get('/ships'),
  get: (id: string) => api.get(`/ships/${id}`),
  create: (data: { name: string; imoNumber: string; type: string; flag?: string }) =>
    api.post('/ships', data),
  update: (id: string, data: Partial<{ name: string; type: string; flag: string }>) =>
    api.put(`/ships/${id}`, data),
  delete: (id: string) => api.delete(`/ships/${id}`),
};

export const usersApi = {
  list: () => api.get('/users'),
  crew: (shipId?: string) => api.get('/users/crew', { params: { shipId } }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const maintenanceApi = {
  list: (params?: { shipId?: string; status?: string; priority?: string; assignedToId?: string }) =>
    api.get('/maintenance', { params }),
  get: (id: string) => api.get(`/maintenance/${id}`),
  overdue: () => api.get('/maintenance/overdue'),
  create: (data: {
    title: string; description: string; shipId: string;
    assignedToId?: string; dueDate: string; priority?: string;
  }) => api.post('/maintenance', data),
  update: (id: string, data: Partial<{
    title: string; description: string; status: string;
    assignedToId: string; dueDate: string; priority: string;
  }>) => api.put(`/maintenance/${id}`, data),
  addNote: (id: string, note: string) => api.post(`/maintenance/${id}/notes`, { note }),
  delete: (id: string) => api.delete(`/maintenance/${id}`),
};

export const drillsApi = {
  list: (params?: { shipId?: string; type?: string; upcoming?: boolean }) =>
    api.get('/drills', { params }),
  get: (id: string) => api.get(`/drills/${id}`),
  create: (data: {
    title: string; type: string; shipId: string;
    scheduledDate: string; description?: string;
  }) => api.post('/drills', data),
  update: (id: string, data: Partial<{
    title: string; type: string; scheduledDate: string; description: string;
  }>) => api.put(`/drills/${id}`, data),
  delete: (id: string) => api.delete(`/drills/${id}`),
  markAttendance: (id: string, attended: boolean, notes?: string) =>
    api.post(`/drills/${id}/attendance`, { attended, notes }),
  getAttendance: (id: string) => api.get(`/drills/${id}/attendance`),
};

export const complianceApi = {
  summary: (shipId?: string) => api.get('/compliance/summary', { params: { shipId } }),
  ships: () => api.get('/compliance/ships'),
  trend: (shipId?: string) => api.get('/compliance/trend', { params: { shipId } }),
  notifications: () => api.get('/compliance/notifications'),
};
