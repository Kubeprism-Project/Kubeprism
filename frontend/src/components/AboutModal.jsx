import { useEffect } from 'react';

export default function AboutModal({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,8,0.80)', backdropFilter: 'blur(4px)',
        zIndex: 200, pointerEvents: 'all',
      }} />

      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 340, zIndex: 201,
        background: '#07090f', border: '1px solid #18253a',
        borderRadius: 12, overflow: 'hidden',
        fontFamily: "'SF Mono','Fira Code',monospace",
        boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
        pointerEvents: 'all',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid #18253a',
          background: '#090c14',
        }}>
          <span style={{ fontSize: 13, color: '#9aaabb', letterSpacing: 2, textTransform: 'uppercase' }}>
            About
          </span>
          <button onClick={onClose} style={btnStyle}>✕</button>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* Logo dot */}
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: '#00ff88', boxShadow: '0 0 16px #00ff88',
          }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', letterSpacing: 3, textTransform: 'uppercase' }}>
              Kubeprism
            </div>
            <div style={{ fontSize: 12, color: '#3a5060', marginTop: 6, letterSpacing: 1 }}>
              Kubernetes 3D Dashboard
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 20,
            border: '1px solid #18253a', background: 'rgba(255,255,255,0.02)',
          }}>
            <span style={{ fontSize: 10, color: '#3a5060', letterSpacing: 1 }}>VERSION</span>
            <span style={{ fontSize: 12, color: '#7eb8d4', letterSpacing: 1 }}>
              {/* eslint-disable-next-line no-undef */}
              {__APP_VERSION__}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

const btnStyle = {
  background: 'none', border: '1px solid #18253a',
  color: '#3a5060', borderRadius: 5, padding: '4px 10px',
  fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
};
