import { useState } from 'react';
import { useStore } from '../store/useStore';

const SECRET_TYPE_SHORT = {
  'Opaque':                          'Opaque',
  'kubernetes.io/tls':               'TLS',
  'kubernetes.io/dockerconfigjson':  'Docker',
  'kubernetes.io/service-account-token': 'SA Token',
};

function Row({ label, value, mono = false }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid #0c1420' }}>
      <span style={{ fontSize: 10, color: '#334455', minWidth: 80, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 11, color: '#7a9aaa', fontFamily: mono ? "inherit" : undefined, wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

function ResourceCard({ item, type }) {
  const [open, setOpen] = useState(false);
  const isCM = type === 'configmap';
  const accent = isCM ? '#22d3ee' : '#f59e0b';

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        background: '#0a0f18', border: `1px solid ${open ? accent + '44' : '#0c1420'}`,
        borderRadius: 6, padding: '8px 12px', cursor: 'pointer',
        marginBottom: 6, transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: 1, color: accent,
          border: `1px solid ${accent}44`, borderRadius: 4, padding: '2px 6px',
        }}>
          {isCM ? 'CM' : (SECRET_TYPE_SHORT[item.type] || 'SECRET')}
        </span>
        <span style={{ fontSize: 12, color: '#8aaabb', flex: 1 }}>{item.name}</span>
        <span style={{ fontSize: 10, color: '#2a3a4a' }}>{item.keys.length} key{item.keys.length !== 1 ? 's' : ''}</span>
        <span style={{ fontSize: 10, color: '#1a2a3a' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #0c1420' }}>
          {!isCM && <Row label="type" value={item.type} />}
          <Row label="keys" value={item.keys.join(', ')} mono />
          <Row label="created" value={item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'} />
          {!isCM && (
            <div style={{ marginTop: 6, fontSize: 10, color: '#1a3a2a', padding: '4px 8px', background: '#0a1a0a', borderRadius: 4 }}>
              Values are not exposed — names only
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConfigsModal() {
  const open              = useStore(s => s.configsOpen);
  const closeConfigs      = useStore(s => s.closeConfigs);
  const selectedNamespace = useStore(s => s.selectedNamespace);
  const clusterData       = useStore(s => s.clusterData);
  const [tab, setTab]     = useState('cm');

  if (!open) return null;

  const ns = selectedNamespace?.name;
  const configMaps = (clusterData?.configMaps || []).filter(c => c.namespace === ns);
  const secrets    = (clusterData?.secrets    || []).filter(s => s.namespace === ns);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeConfigs}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,8,0.7)', zIndex: 200, pointerEvents: 'all' }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: 540, maxHeight: '75vh', zIndex: 201,
          background: '#07090f', border: '1px solid #18253a',
          borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
          fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
          pointerEvents: 'all',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #18253a' }}>
          <span style={{ fontSize: 12, color: '#556677', letterSpacing: 1 }}>CONFIGS</span>
          <span style={{ fontSize: 12, color: '#7a9aaa', flex: 1 }}>{ns}</span>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[['cm', `ConfigMaps (${configMaps.length})`, '#22d3ee'], ['sc', `Secrets (${secrets.length})`, '#f59e0b']].map(([id, label, color]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  background: tab === id ? `${color}18` : 'none',
                  border: `1px solid ${tab === id ? color + '44' : '#18253a'}`,
                  color: tab === id ? color : '#334455',
                  borderRadius: 6, padding: '4px 10px', fontSize: 10,
                  cursor: 'pointer', letterSpacing: 0.5,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={closeConfigs}
            style={{ background: 'none', border: 'none', color: '#334455', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', scrollbarWidth: 'thin', scrollbarColor: '#18253a #07090f' }}>
          {tab === 'cm' && (
            configMaps.length === 0
              ? <div style={{ fontSize: 12, color: '#2a3a4a', textAlign: 'center', padding: 24 }}>No ConfigMaps in this namespace</div>
              : configMaps.map(cm => <ResourceCard key={cm.name} item={cm} type="configmap" />)
          )}
          {tab === 'sc' && (
            secrets.length === 0
              ? <div style={{ fontSize: 12, color: '#2a3a4a', textAlign: 'center', padding: 24 }}>No Secrets in this namespace</div>
              : secrets.map(s => <ResourceCard key={s.name} item={s} type="secret" />)
          )}
        </div>
      </div>
    </>
  );
}
