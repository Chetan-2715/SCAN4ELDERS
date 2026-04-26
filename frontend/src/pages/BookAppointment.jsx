import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { appointmentAPI, authAPI } from '../services/api';

const BookAppointment = () => {
    const { user, speakText } = useContext(AppContext);
    const [date, setDate] = useState('');
    const [doctorId, setDoctorId] = useState('');
    const [doctors, setDoctors] = useState([]);
    const [reason, setReason] = useState('');
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [message, setMessage] = useState('');

    const loadMyBookings = async () => {
        try {
            const res = await appointmentAPI.getMy();
            setBookings(res.data.appointments || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (user?.role === 'patient') {
            loadMyBookings();
            authAPI.listUsers('doctor').then((res) => setDoctors(res.data.users || [])).catch(() => setDoctors([]));
        }
    }, [user?.role]);

    const fetchSlots = async () => {
        if (!date) return;
        try {
            const res = await appointmentAPI.getSlots(doctorId ? Number(doctorId) : null, date);
            setSlots(res.data.slots || []);
            setMessage('Slots loaded. Choose one to book.');
        } catch (err) {
            setMessage(err.response?.data?.detail || 'Failed to load slots');
        }
    };

    const book = async () => {
        if (!selectedSlot || !date) return;
        try {
            await appointmentAPI.book({
                doctor_id: doctorId ? Number(doctorId) : null,
                appointment_date: date,
                slot_start: selectedSlot.slot_start,
                slot_end: selectedSlot.slot_end,
                reason,
            });
            setMessage('Appointment booked successfully.');
            speakText('Appointment booked successfully.');
            setSelectedSlot(null);
            loadMyBookings();
        } catch (err) {
            setMessage(err.response?.data?.detail || 'Failed to book appointment');
        }
    };

    if (user?.role !== 'patient') {
        return <div className="card p-6">Only patients can access appointment booking.</div>;
    }

    return (
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1rem' }}>Book Doctor Appointment</h1>

            <div className="card p-6" style={{ marginBottom: '1rem' }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="doctorId" className="label">Doctor</label>
                        <select id="doctorId" name="doctorId" className="input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                            <option value="">General consultation (no specific doctor)</option>
                            {doctors.map((doctor) => (
                                <option key={doctor.id} value={doctor.id}>{doctor.name} ({doctor.email})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="appointmentDate" className="label">Date</label>
                        <input id="appointmentDate" name="appointmentDate" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'end' }}>
                        <button className="btn btn-primary" onClick={fetchSlots}>Load Slots</button>
                    </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <label htmlFor="visitReason" className="label">Reason for Visit</label>
                    <textarea id="visitReason" name="visitReason" className="input" rows="3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason" />
                </div>

                {slots.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <p className="text-secondary">Select a slot:</p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {slots.map((slot) => (
                                <button
                                    key={`${slot.slot_start}-${slot.slot_end}`}
                                    className={`btn ${selectedSlot?.slot_start === slot.slot_start ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setSelectedSlot(slot)}
                                >
                                    {slot.slot_start} - {slot.slot_end}
                                </button>
                            ))}
                        </div>
                        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={book} disabled={!selectedSlot}>
                            Confirm Booking
                        </button>
                    </div>
                )}

                {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
            </div>

            <div className="card p-6">
                <h2 style={{ marginBottom: '1rem' }}>My Appointments</h2>
                {bookings.length === 0 ? (
                    <p>No appointments yet.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {bookings.map((b) => (
                            <div key={b.id} className="card" style={{ padding: '0.75rem' }}>
                                <strong>{b.appointment_date}</strong> {b.slot_start}-{b.slot_end} | Status: {b.status}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookAppointment;
