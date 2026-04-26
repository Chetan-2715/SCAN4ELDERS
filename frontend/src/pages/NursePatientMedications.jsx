import React, { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppContext } from '../App';
import { nurseAPI } from '../services/api';

const NursePatientMedications = () => {
    const { user } = useContext(AppContext);
    const { patientId } = useParams();
    const [medications, setMedications] = useState([]);
    const [form, setForm] = useState({ medicine_name: '', dosage: '', frequency: '', times: '' });

    const load = async () => {
        try {
            const res = await nurseAPI.getPatientMedications(patientId);
            setMedications(res.data.medications || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (user?.role === 'nurse') load();
    }, [patientId, user?.role]);

    const addMedication = async () => {
        const times = form.times.split(',').map((t) => t.trim()).filter(Boolean);
        await nurseAPI.addPatientMedication(patientId, {
            medicine_name: form.medicine_name,
            dosage: form.dosage,
            frequency: form.frequency,
            timing_json: { times },
        });
        setForm({ medicine_name: '', dosage: '', frequency: '', times: '' });
        load();
    };

    const removeMedication = async (id) => {
        await nurseAPI.deletePatientMedication(id);
        load();
    };

    if (user?.role !== 'nurse') {
        return <div className="card p-6">Only nurses can access this page.</div>;
    }

    return (
        <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h1>Patient #{patientId} Medication Management</h1>
            <div className="card p-6" style={{ marginTop: '1rem' }}>
                <h3>Add Medication</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input id="medicineName" name="medicineName" className="input" placeholder="Medicine name" value={form.medicine_name} onChange={(e) => setForm((p) => ({ ...p, medicine_name: e.target.value }))} />
                    <input id="medicineDosage" name="medicineDosage" className="input" placeholder="Dosage" value={form.dosage} onChange={(e) => setForm((p) => ({ ...p, dosage: e.target.value }))} />
                    <input id="medicineFrequency" name="medicineFrequency" className="input" placeholder="Frequency (e.g. daily)" value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))} />
                    <input id="medicineTimes" name="medicineTimes" className="input" placeholder="Times comma separated e.g. 08:00,20:00" value={form.times} onChange={(e) => setForm((p) => ({ ...p, times: e.target.value }))} />
                </div>
                <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={addMedication}>Add</button>
            </div>

            <div className="card p-6" style={{ marginTop: '1rem' }}>
                <h3>Assigned Medications</h3>
                {medications.length === 0 ? <p>No medications assigned.</p> : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {medications.map((m) => (
                            <div className="card" key={m.id} style={{ padding: '0.75rem' }}>
                                <strong>{m.medicine_name}</strong> - {m.dosage || '-'} - {m.frequency || '-'}
                                <div>Times: {(m.timing_json?.times || []).join(', ') || 'N/A'}</div>
                                <button className="btn btn-outline" style={{ marginTop: '0.5rem' }} onClick={() => removeMedication(m.id)}>Delete</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NursePatientMedications;
