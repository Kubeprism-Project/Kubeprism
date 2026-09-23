import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';

const TYPE_COLOR = {
  NODE:   '#7eb8d4',
  NS:     '#aa88ff',
  DEPLOY: '#7ed4a8',
  STS:    '#a855f7',
  DS:     '#22d3ee',
  CJ:     '#f59e0b',
  POD:    '#d4c07e',
};

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: '#ffffff', background: 'rgba(0,204,255,0.25)', borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchModal() {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const clusterData        = useStore(s => s.clusterData);
  const navigateTo         = useStore(s => s.navigateTo);
  const setViewMode        = useStore(s => s.setViewMode);
  const openPodLogs        = useStore(s => s.openPodLogs);

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build results
  const results = [];
  if (clusterData && query.trim().length > 0) {
    const q = query.toLowerCase();

    for (const n of clusterData.nodes || []) {
      if (n.name.toLowerCase().includes(q)) results.push({ type: 'NODE', label: n.name, sub: n.status, _node: n });
    }
    for (const ns of clusterData.namespaces || []) {
      if (ns.name.toLowerCase().includes(q)) results.push({ type: 'NS', label: ns.name, sub: ns.status, _ns: ns });
    }
    for (const d of clusterData.deployments || []) {
      if (d.name.toLowerCase().includes(q) || d.namespace.toLowerCase().includes(q)) {
        results.push({ type: 'DEPLOY', label: d.name, sub: d.namespace, _dep: d });
      }
    }
    for (const s of clusterData.statefulSets || []) {
      if (s.name.toLowerCase().includes(q) || s.namespace.toLowerCase().includes(q)) {
        results.push({ type: 'STS', label: s.name, sub: s.namespace, _sts: s });
      }
    }
    for (const d of clusterData.daemonSets || []) {
      if (d.name.toLowerCase().includes(q) || d.namespace.toLowerCase().includes(q)) {
        results.push({ type: 'DS', label: d.name, sub: d.namespace, _ds: d });
      }
    }
    for (const c of clusterData.cronJobs || []) {
      if (c.name.toLowerCase().includes(q) || c.namespace.toLowerCase().includes(q)) {
        results.push({ type: 'CJ', label: c.name, sub: c.namespace, _cj: c });
      }
    }
    for (const p of clusterData.pods || []) {
      if (p.name.toLowerCase().includes(q) || p.namespace.toLowerCase().includes(q)) {
        results.push({ type: 'POD', label: p.name, sub: p.namespace, _pod: p });
      }
    }
  }
  const shown = results.slice(0, 12);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, shown.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
      if (e.key === 'Enter' && shown[cursor]) { navigate(shown[cursor]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, cursor, shown]);

  function navigate(item) {
    setOpen(false);
    if (item.type === 'NODE') {
      setViewMode('nodes');
      navigateTo('node', { selectedNode: item._node });
    } else if (item.type === 'NS') {
      setViewMode('namespaces');
      navigateTo('namespace', { selectedNamespace: item._ns });
    } else if (item.type === 'DEPLOY') {
      const ns = (clusterData.namespaces || []).find(n => n.name === item._dep.namespace);
      setViewMode('namespaces');
      navigateTo('deployment', { selectedNamespace: ns || { name: item._dep.namespace }, selectedDeployment: { ...item._dep, kind: 'Deployment' } });
    } else if (item.type === 'STS') {
      const ns = (clusterData.namespaces || []).find(n => n.name === item._sts.namespace);
      setViewMode('namespaces');
      navigateTo('deployment', { selectedNamespace: ns || { name: item._sts.namespace }, selectedDeployment: { ...item._sts, kind: 'StatefulSet' } });
    } else if (item.type === 'DS') {
      const ns = (clusterData.namespaces || []).find(n => n.name === item._ds.namespace);
      setViewMode('namespaces');
      navigateTo('deployment', { selectedNamespace: ns || { name: item._ds.namespace }, selectedDeployment: { ...item._ds, kind: 'DaemonSet' } });
    } else if (item.type === 'CJ') {
      const ns = (clusterData.namespaces || []).find(n => n.name === item._cj.namespace);
      setViewMode('namespaces');
      navigateTo('namespace', { selectedNamespace: ns || { name: item._cj.namespace } });
    } else if (item.type === 'POD') {
      const ns = (clusterData.namespaces || []).find(n => n.name === item._pod.namespace);
      const dep = (clusterData.deployments || []).find(d => d.name === item._pod.ownerName && d.namespace === item._pod.namespace);
      setViewMode('namespaces');
      navigateTo('deployment', { selectedNamespace: ns || { name: item._pod.namespace }, selectedDeployment: dep ? { ...dep, kind: 'Deployment' } : null });
      setTimeout(() => openPodLogs(item._pod), 150);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,8,0.75)', backdropFilter: 'blur(4px)',
          zIndex: 200, pointerEvents: 'all',
        }}
      />

      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)',
          width: 560, zIndex: 201,
          background: '#07090f', border: '1px solid #18253a',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
          fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
          pointerEvents: 'all',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #18253a' }}>
          <span style={{ fontSize: 14, color: '#2a4a5a' }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0); }}
            placeholder="Search pods, namespaces, deployments, nodes…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#9aaabb', fontSize: 13, fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: 10, color: '#1a2a3a', border: '1px solid #18253a', borderRadius: 4, padding: '2px 6px' }}>ESC</span>
        </div>

        {/* Results */}
        {shown.length > 0 && (
          <div style={{ maxHeight: 360, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#18253a #07090f' }}>
            {shown.map((item, i) => (
              <div
                key={i}
                onClick={() => navigate(item)}
                onMouseEnter={() => setCursor(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px', cursor: 'pointer',
                  background: i === cursor ? '#0d1520' : 'transparent',
                  borderBottom: '1px solid #0c1420',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 1,
                  color: TYPE_COLOR[item.type],
                  border: `1px solid ${TYPE_COLOR[item.type]}44`,
                  borderRadius: 4, padding: '2px 6px', minWidth: 48, textAlign: 'center',
                }}>
                  {item.type}
                </span>
                <span style={{ fontSize: 12, color: '#7a9aaa', flex: 1 }}>
                  {highlight(item.label, query)}
                </span>
                {item.sub && (
                  <span style={{ fontSize: 10, color: '#2a3a4a' }}>{item.sub}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query.trim().length > 0 && shown.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: '#2a3a4a' }}>
            No results for "{query}"
          </div>
        )}

        {/* Hint footer */}
        {shown.length > 0 && (
          <div style={{
            padding: '6px 16px', borderTop: '1px solid #0c1420',
            display: 'flex', gap: 16,
          }}>
            {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([k, v]) => (
              <span key={k} style={{ fontSize: 10, color: '#1a2a3a' }}>
                <span style={{ color: '#2a3a4a' }}>{k}</span> {v}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
