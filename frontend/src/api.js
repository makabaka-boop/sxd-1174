import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const colorRuleAPI = {
  list: () => api.get('/color-rules'),
  create: (data) => api.post('/color-rules', data),
};

export const cabinetAPI = {
  list: () => api.get('/cabinets'),
  create: (data) => api.post('/cabinets', data),
};

export const personAPI = {
  list: () => api.get('/responsible-persons'),
  create: (data) => api.post('/responsible-persons', data),
};

export const batchAPI = {
  list: () => api.get('/batches'),
  create: (data) => api.post('/batches', data),
  get: (id) => api.get(`/batches/${id}`),
  update: (id, data) => api.put(`/batches/${id}`, data),
  delete: (id) => api.delete(`/batches/${id}`),
};

export const wristbandAPI = {
  list: (params) => api.get('/wristbands', { params }),
  get: (serial) => api.get(`/wristbands/${serial}`),
  import: (data) => api.post('/wristbands/import', data),
  issue: (data) => api.post('/wristbands/issue', data),
  return: (data) => api.post('/wristbands/return', data),
  confirmReturn: (data) => api.post('/wristbands/confirm-return', data),
  reportAbnormal: (data) => api.post('/wristbands/report-abnormal', data),
  handleAbnormal: (data) => api.post('/wristbands/handle-abnormal', data),
};

export const issueRecordAPI = {
  list: (params) => api.get('/issue-records', { params }),
};

export const returnRecordAPI = {
  list: (params) => api.get('/return-records', { params }),
};

export const abnormalRecordAPI = {
  list: (params) => api.get('/abnormal-records', { params }),
};

export const statsAPI = {
  get: () => api.get('/statistics'),
};
