import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { isAlertPod } from '../utils/alerts';

export default function AlertToast() {
  const clusterData = useStore(s => s.clusterData);
  const [toasts, setToasts] = useState([]);
  const prevAlertKeysRef = useRef(null);

  useEffect(() => {
    if (!clusterData?.pods) return;

    const currentAlertPods = clusterData.pods.filter(isAlertPod);
    const currentKeys = new Set(currentAlertPods.map(p => `${p.namespace}/${p.name}`));

    // Skip toasting on first load — existing alerts are shown via cube colors
    if (prevAlertKeysRef.current === null) {
      prevAlertKeysRef.current = currentKeys;
      return;
    }

    const newAlerts = currentAlertPods.filter(
      p => !prevAlertKeysRef.current.has(`${p.namespace}/${p.name}`)
    );
    prevAlertKeysRef.current = currentKeys;

    if (!newAlerts.length) return;

    const newToasts = newAlerts.map(pod => ({
      id: `${pod.namespace}/${pod.name}/${Date.now()}`,
      pod,
      reason: pod.crashLoop ? 'CrashLoopBackOff' : pod.status === 'Failed' ? 'Failed' : `${pod.restarts} restarts`,
    }));

    setToasts(prev => [...prev, ...newToasts].slice(-5));

    const timers = newToasts.map(t =>
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 6000)
    );
    return () => timers.forEach(clearTimeout);
  }, [clusterData]);

  if (!toasts.length) return null;

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div style={{
        position: 'fixed', bottom: 28, left: 80, zIndex: 200,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
        fontFamily: "'SF Mono','Fira Code',monospace",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: 'rgba(255,30,60,0.1)',
            border: '1px solid rgba(255,51,85,0.45)',
            borderRadius: 8, padding: '8px 14px',
            backdropFilter: 'blur(10px)',
            animation: 'toastIn 0.25s ease',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: '#ff3355', boxShadow: '0 0 8px #ff3355',
            }} />
            <div>
              <div style={{ fontSize: 11, color: '#ff6680', letterSpacing: 0.5 }}>
                {t.reason}
              </div>
              <div style={{ fontSize: 10, color: '#445566', marginTop: 2 }}>
                {t.pod.namespace} / {t.pod.name.length > 30 ? '…' + t.pod.name.slice(-28) : t.pod.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
