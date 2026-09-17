import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

const NODES_LEVELS = ['cluster', 'node'];
const NS_LEVELS    = ['ns-root', 'namespace', 'deployment'];
const NS_LABELS    = { 'ns-root': 'Namespaces', namespace: 'deployment', deployment: 'pods' };

const css = {
  root: {
    position: 'fixed', inset: 0, pointerEvents: 'none', fontFamily: "'SF Mono', 'Fira Code', monospace",
    userSelect: 'none',
  },
  topBar: {
    position: 'absolute', top: 0, left: 64, right: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px',
    background: 'linear-gradient(180deg, rgba(0,0,16,0.95) 0%, transparent 100%)',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
  },
  logoText: {
    fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: 3,
    textTransform: 'uppercase',
  },
  logoDot: {
    width: 8, height: 8, borderRadius: '50%', background: '#00ff88',
    boxShadow: '0 0 8px #00ff88',
  },
  breadcrumb: {
    display: 'flex', alignItems: 'center', gap: 6,
    pointerEvents: 'all',
  },
  crumbBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
    borderRadius: 4, transition: 'all 0.2s',
  },
  crumbSep: {
    color: '#334', fontSize: 14,
  },
  statusBadge: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,16,0.6)',
    backdropFilter: 'blur(8px)',
  },
  dot: (connected) => ({
    width: 7, height: 7, borderRadius: '50%',
    background: connected ? '#00ff88' : '#ff3366',
    boxShadow: connected ? '0 0 6px #00ff88' : '0 0 6px #ff3366',
    animation: connected ? 'pulse 2s infinite' : 'blink 1s infinite',
  }),
  statusText: {
    fontSize: 11, color: '#aaaacc', letterSpacing: 1,
  },

  // Zoom level indicator (bottom center)
  zoomTrack: {
    position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: 0,
    background: 'rgba(0,0,16,0.7)', borderRadius: 30,
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    padding: '6px 16px',
    pointerEvents: 'all',
  },
  zoomStep: (active, past) => ({
    display: 'flex', alignItems: 'center', gap: 0, cursor: past ? 'pointer' : 'default',
  }),
  zoomDot: (active, past) => ({
    width: active ? 10 : 7, height: active ? 10 : 7,
    borderRadius: '50%',
    background: active ? '#00ff88' : past ? '#334466' : '#1a1a2e',
    border: `1px solid ${active ? '#00ff88' : past ? '#334466' : '#1a1a2e'}`,
    boxShadow: active ? '0 0 8px #00ff88' : 'none',
    transition: 'all 0.3s',
  }),
  zoomLine: (past) => ({
    width: 24, height: 1,
    background: past ? '#334466' : '#1a1a2e',
    transition: 'background 0.3s',
  }),
  zoomLabel: (active) => ({
    fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
    color: active ? '#00ff88' : '#334466',
    marginLeft: 8, marginRight: 8,
    transition: 'color 0.3s',
  }),

  // Back button
  backBtn: {
    position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(0,0,16,0.7)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#aaaacc', borderRadius: 20, padding: '7px 20px',
    fontSize: 12, letterSpacing: 1.5, cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'all',
    transition: 'all 0.2s',
  },

  // Stats sidebar
  stats: {
    position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
    display: 'flex', flexDirection: 'column', gap: 10,
    pointerEvents: 'none',
  },
  statCard: {
    background: 'rgba(0,0,16,0.75)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(10px)', minWidth: 130,
  },
  statLabel: { fontSize: 9, color: '#556677', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  statValue: (color = '#ffffff') => ({ fontSize: 22, fontWeight: 700, color }),
  statSub: { fontSize: 10, color: '#445566', marginTop: 2 },

  // Error bar
  errorBar: {
    position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(255,51,102,0.15)', border: '1px solid rgba(255,51,102,0.4)',
    color: '#ff6680', borderRadius: 8, padding: '8px 16px', fontSize: 12,
    backdropFilter: 'blur(8px)',
  },
};

function StatCard({ label, value, sub, color }) {
  return (
    <div style={css.statCard}>
      <div style={css.statLabel}>{label}</div>
      <div style={css.statValue(color)}>{value}</div>
      {sub && <div style={css.statSub}>{sub}</div>}
    </div>
  );
}

export default function HUD() {
  const { level, viewMode, connected, error, clusterData, selectedNode, selectedNamespace, selectedDeployment, navigateBack, navigateToLevel } = useStore();
  const [time, setTime] = useState('');
  const [backHovered, setBackHovered] = useState(false);

  const levelLabels = viewMode === 'namespaces' ? NS_LEVELS : NODES_LEVELS;

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('fr-FR'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const nodes = clusterData?.nodes || [];
  const pods = clusterData?.pods || [];
  const deployments = clusterData?.deployments || [];
  const namespaces = clusterData?.namespaces || [];

  const readyNodes = nodes.filter(n => n.status === 'Ready').length;
  const runningPods = pods.filter(p => p.status === 'Running').length;
  const healthyDeps = deployments.filter(d => d.health === 'Healthy').length;

  const levelIdx = levelLabels.indexOf(level);

  // Breadcrumb items
  const crumbs = viewMode === 'namespaces'
    ? [
        { label: 'NS', level: 'ns-root' },
        selectedNamespace  && { label: selectedNamespace.name.toUpperCase(),  level: 'namespace' },
        selectedDeployment && { label: selectedDeployment.name.toUpperCase(), level: 'deployment' },
      ].filter(Boolean)
    : [
        { label: 'CLUSTER', level: 'cluster' },
        selectedNode && { label: selectedNode.name.toUpperCase(), level: 'node' },
      ].filter(Boolean);

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={css.root}>
        {/* Top bar */}
        <div style={css.topBar}>
          {/* Logo */}
          <div style={css.logo}>
            <div style={css.logoDot} />
            <span style={css.logoText}>Kubeprism</span>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: '#334455' }}>{time}</span>
            <div style={css.statusBadge}>
              <div style={css.dot(connected)} />
              <span style={css.statusText}>
                {connected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats sidebar */}
        <div style={css.stats}>
          <StatCard
            label="Nodes"
            value={`${readyNodes}/${nodes.length}`}
            sub="ready"
            color={readyNodes === nodes.length ? '#00ff88' : '#ffaa00'}
          />
          <StatCard
            label="Pods"
            value={`${runningPods}`}
            sub={`${pods.length} total`}
            color="#00ccff"
          />
          <StatCard
            label="Deployments"
            value={`${healthyDeps}/${deployments.length}`}
            sub="healthy"
            color={healthyDeps === deployments.length ? '#00ff88' : '#ffaa00'}
          />
          <StatCard
            label="Namespaces"
            value={namespaces.length}
            color="#aa88ff"
          />
        </div>

        {/* Zoom track */}
        {level !== 'root' && <div style={css.zoomTrack}>
          {levelLabels.map((l, i) => {
            const active = i === levelIdx;
            const past = i < levelIdx;
            return (
              <div key={l} style={css.zoomStep(active, past)} onClick={() => past && navigateToLevel(l)}>
                {i > 0 && <div style={css.zoomLine(past)} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={css.zoomDot(active, past)} />
                  <span style={css.zoomLabel(active)}>
                    {NS_LABELS[l] || l}
                  </span>
                </div>
              </div>
            );
          })}
        </div>}

        {/* Back button */}
        {level !== 'root' && (
          <button
            style={{
              ...css.backBtn,
              borderColor: backHovered ? 'rgba(0,204,255,0.4)' : 'rgba(255,255,255,0.12)',
              color: backHovered ? '#00ccff' : '#aaaacc',
            }}
            onMouseEnter={() => setBackHovered(true)}
            onMouseLeave={() => setBackHovered(false)}
            onClick={navigateBack}
          >
            ← BACK
          </button>
        )}

        {/* Error */}
        {error && (
          <div style={css.errorBar}>⚠ {error}</div>
        )}

        {/* Loading overlay */}
        {!clusterData && connected && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
            background: 'rgba(0,0,16,0.5)', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 13, color: '#334466', letterSpacing: 3, textTransform: 'uppercase', animation: 'pulse 1.5s infinite' }}>
              Loading cluster data...
            </div>
          </div>
        )}

        {!connected && !error && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 13, color: '#334466', letterSpacing: 3, textTransform: 'uppercase', animation: 'pulse 2s infinite' }}>
              Connecting to backend...
            </div>
            <div style={{ fontSize: 11, color: '#223344' }}>localhost:3001</div>
          </div>
        )}
      </div>
    </>
  );
}
