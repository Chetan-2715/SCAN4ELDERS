import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../App';
import { nurseAPI } from '../services/api';

const NurseDashboard = () => {
    const { user } = useContext(AppContext);
    const [bookings, setBookings] = useState([]);
    const [date, setDate] = useState('');

    const load = async () => {
        try {
            const res = await nurseAPI.getBookings(date || undefined);
            setBookings(res.data.bookings || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (user?.role === 'nurse') load();
    }, [user?.role]);

    if (user?.role !== 'nurse') {
        return <div className="card p-6">Only nurses can access this page.</div>;
    }

    return (
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1rem' }}>Nurse Dashboard</h1>
            <div className="card p-6" style={{ marginBottom: '1rem' }}>
                <label className="label">Filter by date</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    <button className="btn btn-primary" onClick={load}>Load Bookings</button>
                </div>
            </div>
            <div className="card p-6">
                <h2 style={{ marginBottom: '1rem' }}>Booked Patients</h2>
                {bookings.length === 0 ? <p>No bookings found.</p> : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {bookings.map((b) => (
                            <div key={b.id} className="card" style={{ padding: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <strong>Patient #{b.patient_id}</strong> | Doctor #{b.doctor_id || 'N/A'}
                                        <div>{b.appointment_date} {b.slot_start}-{b.slot_end}</div>
                                        <div>Status: {b.status}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Link className="btn btn-outline" to={`/nurse/patient/${b.patient_id}/medications`}>Manage Medicines</Link>
                                        <Link className="btn btn-primary" to={`/nurse/billing?patientId=${b.patient_id}&appointmentId=${b.id}`}>Create Bill</Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NurseDashboard;
