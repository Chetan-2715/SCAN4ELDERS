import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, Stethoscope, EarOff } from 'lucide-react';
import { AppContext } from '../App';

const RoleSelection = () => {
    const navigate = useNavigate();
    const { speakText } = useContext(AppContext);

    const speak = (text) => {
        if (speakText) speakText(text);
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '80vh', padding: '2rem',
        }}>
            <h1 style={{
                fontSize: '2.5rem', fontWeight: 800,
                marginBottom: '3rem', color: 'var(--text-main)', textAlign: 'center',
            }}>
                Select Your Role
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '500px' }}>
                <button
                    onClick={() => { speak("Continue as patient"); setTimeout(() => navigate('/login?mode=register&role=patient'), 300); }}
                    onMouseEnter={() => speak("Patient role")}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
                        padding: '2rem', borderRadius: '1.5rem', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white',
                        fontSize: '1.5rem', fontWeight: 700, boxShadow: '0 8px 30px rgba(37,99,235,0.3)',
                        transition: 'transform 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                    <UserRound size={48} />
                    <span>Patient</span>
                </button>

                <button
                    onClick={() => { speak("Continue as nurse"); setTimeout(() => navigate('/login?mode=register&role=nurse'), 300); }}
                    onMouseEnter={() => speak("Nurse role")}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
                        padding: '2rem', borderRadius: '1.5rem', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #10b981, #047857)', color: 'white',
                        fontSize: '1.5rem', fontWeight: 700, boxShadow: '0 8px 30px rgba(109,40,217,0.3)',
                        transition: 'transform 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                    <Stethoscope size={48} />
                    <span>Nurse</span>
                </button>

                <button
                    onClick={() => { speak("Going to voice assistant"); setTimeout(() => navigate('/blind-assistant'), 300); }}
                    onMouseEnter={() => speak("Blind assistant")}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
                        padding: '2rem', borderRadius: '1.5rem', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white',
                        fontSize: '1.5rem', fontWeight: 700, boxShadow: '0 8px 30px rgba(109,40,217,0.3)',
                        transition: 'transform 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                    <EarOff size={48} />
                    <span>Blind Assistant</span>
                </button>
            </div>
        </div>
    );
};

export default RoleSelection;
