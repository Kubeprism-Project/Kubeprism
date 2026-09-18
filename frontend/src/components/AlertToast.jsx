import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { isAlertPod } from '../utils/alerts';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AlertToast() {
  const clusterData  = useStore(s => s.clusterData);
  const activeAlerts = useStore(s => s.activeAlerts);
  const addAlert     = useStore(s => s.addAlert);
  const dismissAlert = useStore(s => s.dismissAlert);

  useEffect(() => {
    if (!clusterData?.pods) return;

    const alertingPods = clusterData.pods.filter(isAlertPod);
    const alertingKeys = new Set(alertingPods.map(p => `${p.namespace}/${p.name}`));
    const current      = useStore.getState().activeAlerts;

    // Add newly alerting pods
    for (const pod of alertingPods) {
      const key = `${pod.namespace}/${pod.name}`;
      if (!current[key]) {
        addAlert(key, {
          pod,
          reason: pod.crashLoop ? 'CrashLoopBackOff'
                : pod.status === 'Failed' ? 'Failed'
                : `${pod.restarts} restarts`,
        });
      }
    }

    // Auto-recover: dismiss alerts for pods that are no longer alerting
    for (const key of Object.keys(current)) {
      if (!alertingKeys.has(key)) {
        dismissAlert(key);
      }
    }
  }, [clusterData]);

  const entries = Object.entries(activeAlerts);
  if (!entries.length) return null;

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
        {entries.slice(-5).map(([key, { pod, reason, raisedAt }]) => (
          <div key={key} style={{
            background: 'rgba(255,30,60,0.1)',
            border: '1px solid rgba(255,51,85,0.45)',
            borderRadius: 8, padding: '8px 12px 8px 14px',
            backdropFilter: 'blur(10px)',
            animation: 'toastIn 0.25s ease',
            display: 'flex', alignItems: 'center', gap: 10,
            pointerEvents: 'all',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: '#ff3355', boxShadow: '0 0 8px #ff3355',
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#ff6680', letterSpacing: 0.5 }}>
                  {reason}
                </span>
                <span style={{ fontSize: 9, color: '#3a4858' }}>
                  {formatTime(raisedAt)}
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#445566', marginTop: 2 }}>
                {pod.namespace} / {pod.name.length > 30 ? '…' + pod.name.slice(-28) : pod.name}
              </div>
            </div>
            <button
              onClick={() => dismissAlert(key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#3a4858', fontSize: 14, lineHeight: 1, padding: '0 2px', flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#ff6680'}
              onMouseLeave={e => e.currentTarget.style.color = '#3a4858'}
            >✕</button>
          </div>
        ))}
      </div>
    </>
  );
}
