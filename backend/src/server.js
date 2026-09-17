import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { Writable } from 'stream';
import { getClusterData, getLogs, streamLogs, listClusters, getActiveCluster, addCluster, removeCluster, activateCluster } from './k8s.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

app.get('/api/cluster', async (req, res) => {
  try {
    const data = await getClusterData();
    res.json(data);
  } catch (err) {
    console.error('Error fetching cluster data:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- Cluster management ---
app.get('/api/clusters', (req, res) => {
  res.json({ clusters: listClusters(), active: getActiveCluster() });
});

app.post('/api/clusters', (req, res) => {
  const { name, kubeconfig, skipTLS } = req.body;
  if (!name || !kubeconfig) return res.status(400).json({ error: 'name and kubeconfig required' });
  try {
    addCluster(name, kubeconfig, !!skipTLS);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/clusters/:name', (req, res) => {
  try {
    removeCluster(req.params.name);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/clusters/:name/activate', async (req, res) => {
  try {
    activateCluster(req.params.name);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    const data = await getClusterData();
    broadcast(wss.clients, { type: 'cluster_update', data });
    res.json({ ok: true, active: req.params.name });
  } catch (err) {
    // Cluster is active even if first data fetch fails (expired creds, network, etc.)
    const status = err.statusCode || err.code;
    const detail = err.body?.message || err.message;
    console.error(`[ACTIVATE] Connected but data fetch failed (${status}):`, detail);
    res.json({ ok: true, active: req.params.name, warning: detail });
  }
});

// Fetch last N lines of logs (REST)
app.get('/api/pods/:namespace/:name/logs', async (req, res) => {
  const { namespace, name } = req.params;
  const tailLines = parseInt(req.query.tailLines) || 200;
  const container = req.query.container || undefined;
  try {
    const logs = await getLogs(namespace, name, container, tailLines);
    res.type('text/plain').send(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function broadcast(clients, msg) {
  const payload = JSON.stringify(msg);
  clients.forEach(ws => {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  });
}

wss.on('connection', async (ws, req) => {
  console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);
  ws._logAbort = null;

  try {
    const data = await getClusterData();
    ws.send(JSON.stringify({ type: 'cluster_update', data }));
  } catch (err) {
    ws.send(JSON.stringify({ type: 'error', message: err.message }));
  }

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'subscribe_logs') {
      // Abort any existing log stream
      if (ws._logAbort) { ws._logAbort(); ws._logAbort = null; }

      const { namespace, pod, container } = msg;
      console.log(`[LOGS] Streaming ${namespace}/${pod}`);

      const sink = new Writable({
        write(chunk, _enc, cb) {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'log_lines', lines: chunk.toString() }));
          }
          cb();
        },
      });

      try {
        const abort = await streamLogs(namespace, pod, container, sink);
        ws._logAbort = abort;
      } catch (err) {
        ws.send(JSON.stringify({ type: 'log_error', message: err.message }));
      }
    }

    if (msg.type === 'unsubscribe_logs') {
      if (ws._logAbort) { ws._logAbort(); ws._logAbort = null; }
    }
  });

  ws.on('close', () => {
    if (ws._logAbort) ws._logAbort();
    console.log('[WS] Client disconnected');
  });
  ws.on('error', (err) => console.error('[WS] Error:', err.message));
});

// Poll K8S every 5 seconds and push to all clients
setInterval(async () => {
  if (wss.clients.size === 0) return;
  try {
    const data = await getClusterData();
    broadcast(wss.clients, { type: 'cluster_update', data });
  } catch (err) {
    broadcast(wss.clients, { type: 'error', message: err.message });
  }
}, 5000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Kubeprism backend → http://localhost:${PORT}`);
});
