import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { WS_URL } from '../utils/api';

export function useWebSocket() {
  const setClusterData = useStore(s => s.setClusterData);
  const setConnected = useStore(s => s.setConnected);
  const setError = useStore(s => s.setError);
  const wsRef      = useRef(null);
  const retryRef   = useRef(null);
  const destroyed  = useRef(false);

  useEffect(() => {
    destroyed.current = false;
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }

    function connect() {
      if (destroyed.current) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };

      ws.onclose = () => {
        setConnected(false);
        retryRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        setError(`Cannot connect to backend (${WS_URL})`);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'cluster_update') setClusterData(msg.data);
          if (msg.type === 'error') setError(msg.message);
        } catch {}
      };
    }

    connect();
    return () => {
      destroyed.current = true;
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, []);
}
