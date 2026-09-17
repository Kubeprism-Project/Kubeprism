import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { API_BASE as API } from '../utils/api';

export default function ClusterManagerModal({ onClose }) {
  const resetToRoot = useStore(s => s.resetToRoot);
  const [clusters, setClusters]   = useState([]);
  const [active, setActive]       = useState('');
  const [name, setName]           = useState('');
  const [skipTLS, setSkipTLS]     = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState('');
  const fileRef = useRef();

  async function fetchClusters() {
    const r = await fetch(`${API}/api/clusters`);
    const d = await r.json();
    setClusters(d.clusters);
    setActive(d.active);
  }

  useEffect(() => {
    fetchClusters();
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !name.trim()) { setError('Nom requis avant de sélectionner le fichier'); return; }
    setError('');
    setLoading('upload');
    try {
      const content = await file.text();
      const r = await fetch(`${API}/api/clusters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), kubeconfig: content, skipTLS }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setName('');
      setSkipTLS(false);
      fileRef.current.value = '';
      await fetchClusters();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function handleActivate(clusterName) {
    setLoading(clusterName);
    setError('');
    try {
      const r = await fetch(`${API}/api/clusters/${encodeURIComponent(clusterName)}/activate`, { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setActive(clusterName);
      resetToRoot();
      if (d.warning) setError(`Cluster activé mais : ${d.warning}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function handleDelete(clusterName) {
    setLoading(`del-${clusterName}`);
    setError('');
    try {
      const r = await fetch(`${API}/api/clusters/${encodeURIComponent(clusterName)}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await fetchClusters();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,8,0.80)', backdropFilter: 'blur(4px)',
        zIndex: 200, pointerEvents: 'all',
      }} />

      {/* Panel */}
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 480, zIndex: 201,
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
            Clusters
          </span>
          <button onClick={onClose} style={btnStyle(false)}>✕</button>
        </div>

        {/* Cluster list */}
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clusters.map(c => {
            const isActive = c === active;
            const busy     = loading === c || loading === `del-${c}`;
            return (
              <div key={c} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: isActive ? 'rgba(126,184,212,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? '#7eb8d4' : '#18253a'}`,
                borderRadius: 8,
              }}>
                {/* Status dot */}
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: isActive ? '#7ed4a8' : '#2a3a4a',
                  boxShadow: isActive ? '0 0 6px #7ed4a8' : 'none',
                }} />

                <span style={{ flex: 1, fontSize: 12, color: isActive ? '#9aaabb' : '#3a5060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c}
                </span>

                {isActive && (
                  <span style={{ fontSize: 9, color: '#7ed4a8', letterSpacing: 1, textTransform: 'uppercase' }}>ACTIF</span>
                )}

                {!isActive && (
                  <button
                    disabled={busy}
                    onClick={() => handleActivate(c)}
                    style={{ ...btnStyle(false), fontSize: 10, opacity: busy ? 0.4 : 1 }}
                  >
                    {loading === c ? '…' : 'Activer'}
                  </button>
                )}

                {c !== 'default' && (
                  <button
                    disabled={busy}
                    onClick={() => handleDelete(c)}
                    style={{ ...btnStyle(false), fontSize: 10, color: '#d47e7e', borderColor: '#3a1a1a', opacity: busy ? 0.4 : 1 }}
                  >
                    {loading === `del-${c}` ? '…' : '✕'}
                  </button>
                )}
              </div>
            );
          })}

          {clusters.length === 0 && (
            <div style={{ fontSize: 12, color: '#2a3a4a', textAlign: 'center', padding: '12px 0' }}>
              Aucun cluster enregistré
            </div>
          )}
        </div>

        {/* Add cluster */}
        <div style={{ padding: '12px 20px 18px', borderTop: '1px solid #18253a' }}>
          <div style={{ fontSize: 10, color: '#2a3a4a', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Ajouter un cluster
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={skipTLS}
              onChange={e => setSkipTLS(e.target.checked)}
              style={{ accentColor: '#d4c07e', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 11, color: skipTLS ? '#d4c07e' : '#3a5060' }}>
              Contourner la vérification TLS
            </span>
          </label>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Nom du cluster"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                flex: 1, background: '#0e1824', border: '1px solid #18253a',
                color: '#9aaabb', borderRadius: 6, padding: '7px 12px',
                fontSize: 12, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!name.trim() || loading === 'upload'}
              style={{
                ...btnStyle(false),
                fontSize: 11,
                opacity: !name.trim() ? 0.4 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {loading === 'upload' ? 'Upload…' : '↑ Kubeconfig'}
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".yaml,.yml,.conf,.json"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />

          {error && (
            <div style={{ fontSize: 11, color: '#d47e7e', marginTop: 6 }}>{error}</div>
          )}
        </div>
      </div>
    </>
  );
}

const btnStyle = (active) => ({
  background: active ? '#1a2535' : 'none',
  border: '1px solid #18253a',
  color: active ? '#7eb8d4' : '#3a5060',
  borderRadius: 5, padding: '4px 12px',
  fontSize: 10, fontFamily: 'inherit',
  cursor: 'pointer', letterSpacing: 1,
});
