import React, { useEffect, useState } from 'react';
import { notificationAPI } from '../services/api';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);

    const load = async () => {
        try {
            const res = await notificationAPI.getMy();
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const markRead = async (id) => {
        await notificationAPI.markRead(id);
        load();
    };

    const markAllRead = async () => {
        await notificationAPI.markAllRead();
        load();
    };

    return (
        <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Notifications</h1>
                <button className="btn btn-outline" onClick={markAllRead}>Mark all read</button>
            </div>

            <div className="card p-6" style={{ marginTop: '1rem' }}>
                {notifications.length === 0 ? <p>No notifications.</p> : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {notifications.map((n) => (
                            <div key={n.id} className="card" style={{ padding: '0.75rem', borderLeft: n.is_read ? '4px solid #cbd5e1' : '4px solid #2563eb' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong>{n.title}</strong>
                                    {!n.is_read && <button className="btn btn-outline" onClick={() => markRead(n.id)}>Mark read</button>}
                                </div>
                                <div style={{ marginTop: '0.25rem' }}>{n.message}</div>
                                <small style={{ opacity: 0.7 }}>{n.type} | {new Date(n.created_at).toLocaleString()}</small>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
