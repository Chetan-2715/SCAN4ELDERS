import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    const domain = localStorage.getItem('selectedConcern');
    const language = localStorage.getItem('language') || 'en';
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (domain) {
        config.headers.domain = domain;
    }
    config.headers['Accept-Language'] = language;
    return config;
});

export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    getProfile: () => api.get('/auth/profile'),
    updateProfile: (data) => api.put('/auth/profile', data),
    listUsers: (role) => api.get(`/auth/users${role ? `?role=${role}` : ''}`),
};

export const prescriptionAPI = {
    upload: (formData) => api.post('/prescriptions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getAll: () => api.get('/prescriptions/'),
    getById: (id) => api.get(`/prescriptions/${id}`),
};

export const medicineAPI = {
    search: (name) => api.get(`/medicine/${name}`),
    scanBarcode: (data) => api.post('/medicine/scan-barcode', data),
    scanBarcodeImage: (formData) => api.post('/medicine/scan-barcode-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    verifyTablet: (data) => api.post('/medicine/verify-tablet', data),
    verifyTabletImage: (formData) => api.post('/medicine/verify-tablet', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    explainTerm: (term) => api.post('/medicine/explain-term', { term }),
    getHistory: () => api.get('/medicine/history/all'),
};

export const remindersAPI = {
    getAll: () => api.get('/reminders/'),
    create: (data) => api.post('/reminders/set-reminder', data),
    update: (id, data) => api.put(`/reminders/${id}`, data),
    delete: (id) => api.delete(`/reminders/${id}`),
};

export const chatbotAPI = {
    chat: (data) => api.post('/chatbot/chat', data),
    chatImage: (formData) => api.post('/chatbot/chat-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

export const voiceAPI = {
    processVoice: (text) => api.post('/voice/process', { text }),
};

export const appointmentAPI = {
    book: (data) => api.post('/appointments/book', data),
    getMy: () => api.get('/appointments/my'),
    getSlots: (doctorId, appointmentDate) => {
        const doctorQuery = doctorId ? `doctor_id=${doctorId}&` : '';
        return api.get(`/appointments/slots?${doctorQuery}appointment_date=${appointmentDate}`);
    },
    updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
};

export const nurseAPI = {
    getBookings: (date) => api.get(`/nurse/bookings${date ? `?date=${date}` : ''}`),
    addPatientMedication: (patientId, data) => api.post(`/nurse/patients/${patientId}/medications`, data),
    getPatientMedications: (patientId) => api.get(`/nurse/patients/${patientId}/medications`),
    updatePatientMedication: (medicationId, data) => api.put(`/nurse/medications/${medicationId}`, data),
    deletePatientMedication: (medicationId) => api.delete(`/nurse/medications/${medicationId}`),
};

export const notificationAPI = {
    getMy: () => api.get('/notifications/my'),
    markRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllRead: () => api.post('/notifications/mark-all-read'),
    runMedicineReminder: () => api.post('/notifications/medicine-reminder-run'),
};

export const billingAPI = {
    create: (data) => api.post('/billing/create', data),
    getByPatient: (patientId) => api.get(`/billing/patient/${patientId}`),
    updateStatus: (billId, status) => api.patch(`/billing/${billId}/status`, { status }),
    getPdfPayload: (billId) => api.get(`/billing/${billId}/pdf`),
};

export default api;
