import { useState } from 'react';
import ClusterManagerModal from './ClusterManagerModal';
import AboutModal from './AboutModal';

export default function Sidebar() {
  const [showClusters, setShowClusters] = useState(false);
  const [showAbout,    setShowAbout]    = useState(false);

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 64, zIndex: 50, pointerEvents: 'all',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 56, gap: 4,
        background: 'linear-gradient(90deg, rgba(0,0,10,0.92) 0%, rgba(0,0,10,0.6) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}>
        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* About button */}
        <button
          title="About"
          onClick={() => setShowAbout(true)}
          style={{
            width: 44, height: 44,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            background: 'none', border: 'none', borderRadius: 8,
            color: '#3a5060', cursor: 'pointer',
            transition: 'all 0.2s', outline: 'none',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#7eb8d4'}
          onMouseLeave={e => e.currentTarget.style.color = '#3a5060'}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.2" />
            <line x1="9" y1="8" x2="9" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="9" cy="5.5" r="0.8" fill="currentColor" />
          </svg>
          <span style={{ fontSize: 8, letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: "'SF Mono', monospace", lineHeight: 1 }}>
            About
          </span>
        </button>

        {/* Cluster manager button */}
        <button
          title="Gérer les clusters"
          onClick={() => setShowClusters(true)}
          style={{
            width: 44, height: 44, marginBottom: 16,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            background: 'none', border: 'none', borderRadius: 8,
            color: '#3a5060', cursor: 'pointer',
            transition: 'all 0.2s', outline: 'none',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#7eb8d4'}
          onMouseLeave={e => e.currentTarget.style.color = '#3a5060'}
        >
          {/* Cluster icon: stacked layers */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <ellipse cx="9" cy="5"  rx="6" ry="2"   stroke="currentColor" strokeWidth="1.2" />
            <path d="M3 5v4c0 1.1 2.7 2 6 2s6-.9 6-2V5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3 9v4c0 1.1 2.7 2 6 2s6-.9 6-2V9" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span style={{ fontSize: 8, letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: "'SF Mono', monospace", lineHeight: 1 }}>
            K8S
          </span>
        </button>
      </div>

      {showClusters && <ClusterManagerModal onClose={() => setShowClusters(false)} />}
      {showAbout    && <AboutModal          onClose={() => setShowAbout(false)} />}
    </>
  );
}
