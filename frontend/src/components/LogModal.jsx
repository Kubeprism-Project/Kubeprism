import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { API_BASE, WS_URL } from '../utils/api';

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function lineColor(line) {
  const l = line.toLowerCase();
  if (l.includes('error') || l.includes('fatal') || l.includes('panic') || l.includes('exception')) return '#e89090';
  if (l.includes('warn')) return '#d4c07e';
  if (l.includes('debug')) return '#5a6a7a';
  return '#7a9aaa';
}

export default function LogModal() {
  const selectedPod  = useStore(s => s.selectedPod);
  const clusterData  = useStore(s => s.clusterData);
  const closePodLogs = useStore(s => s.closePodLogs);

  const [lines, setLines]   = useState([]);
  const [status, setStatus] = useState('idle');
  const [container, setContainer] = useState('');
  const [paused, setPaused] = useState(false);

  const wsRef     = useRef(null);
  const pausedRef = useRef(false);
  const bottomRef = useRef(null);

  // Resolve containers: from clusterData or directly from selectedPod object
  const podFromStore = clusterData?.pods?.find(
    p => p.name === selectedPod?.name && p.namespace === selectedPod?.namespace
  );
  const containers = (podFromStore?.containers || selectedPod?.containers || []).map(c =>
    typeof c === 'string' ? c : c.name
  );

  // Reset container when pod changes, picking first container immediately
  useEffect(() => {
    if (!selectedPod) return;
    const first = containers[0] || '';
    setContainer(first);
    setLines([]);
    setPaused(false);
    pausedRef.current = false;
  }, [selectedPod?.name, selectedPod?.namespace]);

  // Fetch logs when pod + container are both set
  useEffect(() => {
    if (!selectedPod?.name || !container) return;

    setLines([]);
    setStatus('loading');

    // Abort previous WS
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: 'unsubscribe_logs' })); } catch {}
      wsRef.current.close();
      wsRef.current = null;
    }

    const { namespace, name } = selectedPod;
    const url = `${API_BASE}/api/pods/${namespace}/${name}/logs?tailLines=100&container=${encodeURIComponent(container)}`;

    // 1) REST — last 100 lines
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(text => {
        const parsed = text.split('\n').filter(l => l.trim()).map(l => stripAnsi(l));
        setLines(parsed);
        setStatus('streaming');
      })
      .catch(err => {
        setLines([`[ERROR fetching logs] ${err.message}`]);
        setStatus('error');
      });

    // 2) WS — live stream
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe_logs', namespace, pod: name, container }));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'log_lines' && !pausedRef.current) {
          const incoming = msg.lines.split('\n').filter(l => l.trim()).map(l => stripAnsi(l));
          setLines(prev => [...prev, ...incoming].slice(-2000));
        }
      } catch {}
    };
    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      if (wsRef.current) {
        try { wsRef.current.send(JSON.stringify({ type: 'unsubscribe_logs' })); } catch {}
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedPod?.name, selectedPod?.namespace, container]);

  // Auto-scroll
  useEffect(() => {
    if (!pausedRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'instant' });
    }
  }, [lines]);

  // Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closePodLogs(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closePodLogs]);

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(p => !p);
  };

  if (!selectedPod) return null;

  return (
    <>
      <div onClick={closePodLogs} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,8,0.82)',
        backdropFilter: 'blur(4px)', zIndex: 100, pointerEvents: 'all',
      }} />

      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', top: '5%', left: '6%', right: '6%', bottom: '5%',
        zIndex: 101, background: '#07090f', border: '1px solid #18253a',
        borderRadius: 10, display: 'flex', flexDirection: 'column',
        fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
        pointerEvents: 'all',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '10px 16px', borderBottom: '1px solid #18253a',
          background: '#090c14', flexShrink: 0,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: status === 'streaming' ? '#7ed4a8' : status === 'error' ? '#e89090' : '#d4c07e',
            boxShadow: status === 'streaming' ? '0 0 6px #7ed4a8' : 'none',
          }} />
          <span style={{ fontSize: 11, color: '#5a8aaa' }}>{selectedPod.namespace}</span>
          <span style={{ color: '#18253a' }}>/</span>
          <span style={{ fontSize: 11, color: '#9aaabb', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedPod.name}
          </span>

          {containers.length > 1 ? (
            <select value={container} onChange={e => setContainer(e.target.value)} style={{
              background: '#0e1824', border: '1px solid #18253a', color: '#7a9aaa',
              borderRadius: 5, padding: '3px 8px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
            }}>
              {containers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <span style={{ fontSize: 10, color: '#2a3a4a', border: '1px solid #18253a', padding: '3px 8px', borderRadius: 5 }}>
              {containers[0] || container}
            </span>
          )}

          <button onClick={togglePause} style={btn(paused)}>{paused ? '▶ RESUME' : '⏸ PAUSE'}</button>
          <button onClick={() => setLines([])} style={btn(false)}>CLEAR</button>
          <button onClick={closePodLogs} style={{ ...btn(false), fontSize: 14 }}>✕</button>
        </div>

        {/* Logs */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', scrollbarWidth: 'thin', scrollbarColor: '#18253a #07090f' }}>
          {lines.length === 0 && (
            <div style={{ color: '#2a3a4a', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
              {status === 'loading' ? 'Fetching logs…' : status === 'error' ? 'Could not fetch logs.' : 'No logs.'}
            </div>
          )}
          {lines.map((line, i) => (
            <div key={i} style={{ fontSize: 11.5, lineHeight: 1.65, color: lineColor(line), whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {line}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '5px 16px', borderTop: '1px solid #18253a', background: '#090c14',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: '#2a3a4a' }}>{lines.length} lines</span>
          {status === 'streaming' && !paused && <span style={{ fontSize: 10, color: '#7ed4a8', letterSpacing: 1 }}>● LIVE</span>}
          {paused && <span style={{ fontSize: 10, color: '#d4c07e', letterSpacing: 1 }}>⏸ PAUSED</span>}
          <span style={{ fontSize: 10, color: '#18253a', marginLeft: 'auto' }}>ESC to close</span>
        </div>
      </div>
    </>
  );
}

const btn = (active) => ({
  background: active ? '#1a2535' : 'none', border: '1px solid #18253a',
  color: active ? '#7eb8d4' : '#3a5060', borderRadius: 5,
  padding: '3px 10px', fontSize: 10, fontFamily: 'inherit',
  cursor: 'pointer', letterSpacing: 1,
});
