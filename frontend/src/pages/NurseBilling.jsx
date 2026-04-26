import React, { useContext, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppContext } from '../App';
import { billingAPI } from '../services/api';

const NurseBilling = () => {
    const { user } = useContext(AppContext);
    const [search] = useSearchParams();
    const [patientId, setPatientId] = useState(search.get('patientId') || '');
    const [appointmentId, setAppointmentId] = useState(search.get('appointmentId') || '');
    const [discount, setDiscount] = useState('0');
    const [tax, setTax] = useState('0');
    const [items, setItems] = useState([{ item_type: 'consultation', description: 'Consultation', qty: 1, unit_price: 0 }]);
    const [message, setMessage] = useState('');

    if (user?.role !== 'nurse') {
        return <div className="card p-6">Only nurses can access billing.</div>;
    }

    const updateItem = (idx, key, value) => {
        const next = [...items];
        next[idx] = { ...next[idx], [key]: value };
        setItems(next);
    };

    const addItem = () => {
        setItems((prev) => [...prev, { item_type: 'medicine', description: '', qty: 1, unit_price: 0 }]);
    };

    const createBill = async () => {
        try {
            const payload = {
                patient_id: Number(patientId),
                appointment_id: appointmentId ? Number(appointmentId) : null,
                discount: Number(discount || 0),
                tax: Number(tax || 0),
                items: items.map((i) => ({ ...i, qty: Number(i.qty), unit_price: Number(i.unit_price) })),
            };
            const res = await billingAPI.create(payload);
            setMessage(`Bill #${res.data.bill_id} created. Total: ${res.data.total}`);
        } catch (err) {
            setMessage(err.response?.data?.detail || 'Failed to create bill');
        }
    };

    return (
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h1>Nurse Billing</h1>
            <div className="card p-6" style={{ marginTop: '1rem' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input className="input" placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
                    <input className="input" placeholder="Appointment ID (optional)" value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} />
                </div>

                <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
                    {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <input className="input" value={item.item_type} onChange={(e) => updateItem(idx, 'item_type', e.target.value)} placeholder="Type" />
                            <input className="input" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Description" />
                            <input className="input" type="number" value={item.qty} onChange={(e) => updateItem(idx, 'qty', e.target.value)} placeholder="Qty" />
                            <input className="input" type="number" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} placeholder="Unit price" />
                        </div>
                    ))}
                </div>

                <button className="btn btn-outline" style={{ marginTop: '0.75rem' }} onClick={addItem}>Add Item</button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ marginTop: '1rem' }}>
                    <input className="input" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Discount" />
                    <input className="input" type="number" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="Tax" />
                </div>

                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={createBill}>Create Bill</button>
                {message && <p style={{ marginTop: '0.75rem' }}>{message}</p>}
            </div>
        </div>
    );
};

export default NurseBilling;
