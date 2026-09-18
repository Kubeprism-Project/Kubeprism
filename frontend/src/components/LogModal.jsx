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

const EVENT_REASON_COLOR = {
  OOMKilling: '#e89090', BackOff: '#e89090', Failed: '#e89090',
  Unhealthy: '#d4c07e', FailedScheduling: '#d4c07e',
  Scheduled: '#7ed4a8', Pulled: '#7ed4a8', Started: '#7ed4a8', Created: '#7ed4a8', Pulling: '#7a9aaa',
};

function EventsPanel({ pod }) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!pod) return;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/pods/${pod.namespace}/${pod.name}/events`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setEvents(d.events || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [pod?.name, pod?.namespace]);

  if (loading) return <Empty>Fetching events…</Empty>;
  if (error)   return <Empty>Could not fetch events: {error}</Empty>;
  if (!events.length) return <Empty>No events found for this pod.</Empty>;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', scrollbarWidth: 'thin', scrollbarColor: '#18253a #07090f' }}>
      {[...events].reverse().map((ev, i) => {
        const color = ev.type === 'Warning' ? '#e89090' : '#7ed4a8';
        const reasonColor = EVENT_REASON_COLOR[ev.reason] || (ev.type === 'Warning' ? '#e89090' : '#7ed4a8');
        return (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '140px 70px 110px 1fr auto',
            gap: '0 12px', alignItems: 'start',
            padding: '7px 16px', borderBottom: '1px solid #0c1420',
          }}>
            <span style={{ fontSize: 10, color: '#3a5a6a', whiteSpace: 'nowrap' }}>
              {new Date(ev.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span style={{ fontSize: 10, color, letterSpacing: 0.5, fontWeight: 600 }}>
              {ev.type?.toUpperCase()}
            </span>
            <span style={{ fontSize: 10, color: reasonColor, letterSpacing: 0.5 }}>
              {ev.reason}
            </span>
            <span style={{ fontSize: 10.5, color: '#6a8a9a', lineHeight: 1.5, wordBreak: 'break-word' }}>
              {ev.message}
            </span>
            {ev.count > 1 && (
              <span style={{ fontSize: 9, color: '#3a4a5a', border: '1px solid #18253a', borderRadius: 10, padding: '1px 6px', whiteSpace: 'nowrap' }}>
                ×{ev.count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Empty({ children }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a3a4a', fontSize: 12 }}>
      {children}
    </div>
  );
}

export default function LogModal() {
  const selectedPod  = useStore(s => s.selectedPod);
  const clusterData  = useStore(s => s.clusterData);
  const closePodLogs = useStore(s => s.closePodLogs);

  const [tab, setTab]       = useState('logs');
  const [lines, setLines]   = useState([]);
  const [status, setStatus] = useState('idle');
  const [container, setContainer] = useState('');
  const [paused, setPaused] = useState(false);

  const wsRef     = useRef(null);
  const pausedRef = useRef(false);
  const bottomRef = useRef(null);

  const podFromStore = clusterData?.pods?.find(
    p => p.name === selectedPod?.name && p.namespace === selectedPod?.namespace
  );
  const containers = (podFromStore?.containers || selectedPod?.containers || []).map(c =>
    typeof c === 'string' ? c : c.name
  );

  useEffect(() => {
    if (!selectedPod) return;
    setContainer(containers[0] || '');
    setLines([]);
    setTab('logs');
    setPaused(false);
    pausedRef.current = false;
  }, [selectedPod?.name, selectedPod?.namespace]);

  useEffect(() => {
    if (!selectedPod?.name || !container || tab !== 'logs') return;

    setLines([]);
    setStatus('loading');

    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: 'unsubscribe_logs' })); } catch {}
      wsRef.current.close();
      wsRef.current = null;
    }

    const { namespace, name } = selectedPod;
    fetch(`${API_BASE}/api/pods/${namespace}/${name}/logs?tailLines=100&container=${encodeURIComponent(container)}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(text => {
        setLines(text.split('\n').filter(l => l.trim()).map(l => stripAnsi(l)));
        setStatus('streaming');
      })
      .catch(err => { setLines([`[ERROR fetching logs] ${err.message}`]); setStatus('error'); });

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe_logs', namespace, pod: name, container }));
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
  }, [selectedPod?.name, selectedPod?.namespace, container, tab]);

  useEffect(() => {
    if (!pausedRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'instant' });
    }
  }, [lines]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closePodLogs(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closePodLogs]);

  const togglePause = () => { pausedRef.current = !pausedRef.current; setPaused(p => !p); };

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
          <span style={{ fontSize: 11, color: '#9aaabb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedPod.name}
          </span>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            <button onClick={() => setTab('logs')}   style={tab === 'logs'   ? tabActive : tabIdle}>LOGS</button>
            <button onClick={() => setTab('events')} style={tab === 'events' ? tabActive : tabIdle}>EVENTS</button>
          </div>

          <div style={{ flex: 1 }} />

          {tab === 'logs' && containers.length > 1 ? (
            <select value={container} onChange={e => setContainer(e.target.value)} style={{
              background: '#0e1824', border: '1px solid #18253a', color: '#7a9aaa',
              borderRadius: 5, padding: '3px 8px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
            }}>
              {containers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : tab === 'logs' && (
            <span style={{ fontSize: 10, color: '#2a3a4a', border: '1px solid #18253a', padding: '3px 8px', borderRadius: 5 }}>
              {containers[0] || container}
            </span>
          )}

          {tab === 'logs' && <button onClick={togglePause} style={btn(paused)}>{paused ? '▶ RESUME' : '⏸ PAUSE'}</button>}
          {tab === 'logs' && <button onClick={() => setLines([])} style={btn(false)}>CLEAR</button>}
          <button onClick={closePodLogs} style={{ ...btn(false), fontSize: 14 }}>✕</button>
        </div>

        {/* Body */}
        {tab === 'logs' ? (
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
        ) : (
          <EventsPanel pod={selectedPod} />
        )}

        {/* Footer */}
        <div style={{
          padding: '5px 16px', borderTop: '1px solid #18253a', background: '#090c14',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          {tab === 'logs' ? (
            <>
              <span style={{ fontSize: 10, color: '#2a3a4a' }}>{lines.length} lines</span>
              {status === 'streaming' && !paused && <span style={{ fontSize: 10, color: '#7ed4a8', letterSpacing: 1 }}>● LIVE</span>}
              {paused && <span style={{ fontSize: 10, color: '#d4c07e', letterSpacing: 1 }}>⏸ PAUSED</span>}
            </>
          ) : (
            <span style={{ fontSize: 10, color: '#2a3a4a' }}>Events — most recent first</span>
          )}
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

const tabActive = {
  background: '#1a2535', border: '1px solid #2a4060', color: '#7eb8d4',
  borderRadius: 5, padding: '3px 12px', fontSize: 10, fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
  cursor: 'pointer', letterSpacing: 1,
};

const tabIdle = {
  background: 'none', border: '1px solid #18253a', color: '#3a5060',
  borderRadius: 5, padding: '3px 12px', fontSize: 10, fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
  cursor: 'pointer', letterSpacing: 1,
};
