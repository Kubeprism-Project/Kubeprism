// Synthetic demo cluster — no real Kubernetes needed
const NAMESPACES = ['production', 'staging', 'monitoring', 'kube-system', 'ingress', 'logging'];

const DEPLOYMENTS = [
  // production
  { name: 'api-gateway',      ns: 'production', replicas: 3, memPct: 62 },
  { name: 'auth-service',     ns: 'production', replicas: 2, memPct: 45 },
  { name: 'worker',           ns: 'production', replicas: 5, memPct: 78 },
  { name: 'scheduler',        ns: 'production', replicas: 1, memPct: 30 },
  { name: 'notifier',         ns: 'production', replicas: 2, memPct: 55 },
  { name: 'data-sync',        ns: 'production', replicas: 1, memPct: 58 },
  { name: 'event-processor',  ns: 'production', replicas: 2, memPct: 71 },
  // staging
  { name: 'api-gateway',      ns: 'staging',    replicas: 1, memPct: 20 },
  { name: 'auth-service',     ns: 'staging',    replicas: 1, memPct: 15 },
  { name: 'worker',           ns: 'staging',    replicas: 2, memPct: 40 },
  { name: 'event-handler',    ns: 'staging',    replicas: 1, memPct: 25 },
  // monitoring
  { name: 'prometheus',       ns: 'monitoring', replicas: 1, memPct: 70 },
  { name: 'grafana',          ns: 'monitoring', replicas: 1, memPct: 35 },
  { name: 'alertmanager',     ns: 'monitoring', replicas: 1, memPct: 22 },
  // kube-system
  { name: 'coredns',          ns: 'kube-system', replicas: 2, memPct: 18 },
  { name: 'metrics-server',   ns: 'kube-system', replicas: 1, memPct: 12 },
  { name: 'cilium',           ns: 'kube-system', replicas: 2, memPct: 28 },
  // ingress
  { name: 'ingress-nginx',    ns: 'ingress',    replicas: 2, memPct: 42 },
  { name: 'cert-manager',     ns: 'ingress',    replicas: 1, memPct: 16 },
  // logging
  { name: 'loki',             ns: 'logging',    replicas: 1, memPct: 52 },
  { name: 'promtail',         ns: 'logging',    replicas: 2, memPct: 33 },
];

const NODES = [
  { name: 'k8s-node-01', pods: 40 },
  { name: 'k8s-node-02', pods: 35 },
  { name: 'k8s-node-03', pods: 28 },
];

// Rotating incidents — new alert every 2 min, active for first 30s then auto-recovers
// Each entry covers a different failure scenario for maximum demo coverage
const INCIDENT_POOL = [
  // OOMKilled — memory above threshold → status Failed
  { name: 'payment-service',  ns: 'production',  replicas: 2, memPct: 98 },
  // CrashLoopBackOff — container keeps restarting
  { name: 'recommender',      ns: 'staging',     replicas: 1, memPct: 40, crashLoop: true },
  // High restart count — pod unstable but still Running
  { name: 'vector',           ns: 'logging',     replicas: 1, memPct: 55, restarts: 11 },
  // OOM on single-replica critical service
  { name: 'redis-cache',      ns: 'production',  replicas: 1, memPct: 97 },
  // CrashLoop in kube-system — infra-level incident
  { name: 'kube-proxy',       ns: 'kube-system', replicas: 2, memPct: 44, crashLoop: true },
  // Restart storm in monitoring stack
  { name: 'tracing-agent',    ns: 'monitoring',  replicas: 1, memPct: 50, restarts: 9 },
  // Multi-pod OOM in staging
  { name: 'load-tester',      ns: 'staging',     replicas: 3, memPct: 96 },
  // CrashLoop in ingress — external traffic impact
  { name: 'ingress-default-backend', ns: 'ingress', replicas: 1, memPct: 35, crashLoop: true },
  // Restart accumulation on monitoring
  { name: 'thanos-compactor', ns: 'monitoring',  replicas: 1, memPct: 60, restarts: 7 },
  // OOM burst in production worker pool
  { name: 'batch-processor',  ns: 'production',  replicas: 4, memPct: 95 },
];

// Stable random suffixes per deployment/pod — seeded to be consistent across calls
const _seeds = {};
function stableSuffix(key, len = 5) {
  if (!_seeds[key]) {
    let h = 0;
    for (const c of key) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
    _seeds[key] = Math.abs(h).toString(36).padStart(len, '0').slice(0, len);
  }
  return _seeds[key];
}

// Fluctuate memPct slightly each call to simulate live metrics
function fluctuate(base) {
  return Math.min(99, Math.max(1, base + Math.round((Math.random() - 0.5) * 6)));
}

function podStatus(memPct) {
  if (memPct > 90) return 'Failed';
  return 'Running';
}

export function getDemoData() {
  const now           = new Date().toISOString();
  const WAVE_MS       = 2 * 60 * 1000; // new incident every 2 minutes
  const ACTIVE_MS     = 90 * 1000;     // incident active for 90s, then 30s of calm before next wave
  const waveIdx       = Math.floor(Date.now() / WAVE_MS);
  const wavePhaseMs   = Date.now() % WAVE_MS;
  const incidentActive = wavePhaseMs < ACTIVE_MS;
  const incident      = incidentActive ? INCIDENT_POOL[waveIdx % INCIDENT_POOL.length] : null;

  const pods = [];
  const deployments = [];

  // Node assignment round-robin
  const nodeNames = NODES.map(n => n.name);
  let nodeIdx = 0;

  for (const dep of DEPLOYMENTS) {
    const selector = { app: dep.name, env: dep.ns };
    deployments.push({
      name: dep.name,
      namespace: dep.ns,
      replicas: dep.replicas,
      readyReplicas: dep.replicas,
      availableReplicas: dep.replicas,
      updatedReplicas: dep.replicas,
      health: 'Healthy',
      createdAt: now,
      labels: selector,
      selector,
      images: [`registry.example.com/${dep.name}:latest`],
    });

    for (let i = 0; i < dep.replicas; i++) {
      const suffix = stableSuffix(`${dep.ns}/${dep.name}/${i}`);
      const memPct = fluctuate(dep.memPct);
      const memLimitMi = 512;
      const memUsedMi = Math.round(memLimitMi * memPct / 100);
      const crashLoop = dep.crashLoop || false;
      const restarts  = dep.restarts || (crashLoop ? 12 : 0);
      const status    = crashLoop ? 'Running' : podStatus(memPct);
      pods.push({
        name: `${dep.name}-${suffix}`,
        namespace: dep.ns,
        nodeName: nodeNames[nodeIdx % nodeNames.length],
        status,
        ready: status === 'Running' && !crashLoop,
        restarts,
        crashLoop,
        containers: [{ name: dep.name, image: `registry.example.com/${dep.name}:latest` }],
        createdAt: now,
        labels: { app: dep.name, env: dep.ns },
        ownerKind: 'ReplicaSet',
        ownerName: `${dep.name}-${suffix}`,
        cpuLimit: '200m',
        memLimit: `${memLimitMi}Mi`,
        memLimitBytes: memLimitMi * 1024 * 1024,
        cpuRequest: '50m',
        memRequest: '128Mi',
        cpu: `${Math.round(10 + Math.random() * 80)}m`,
        memory: `${memUsedMi}Mi`,
        memPct,
      });
      nodeIdx++;
    }
  }

  // Inject the current rotating incident pod (only during the active window)
  if (incident) {
    const dep = incident;
    const selector = { app: dep.name, env: dep.ns };
    deployments.push({
      name: dep.name, namespace: dep.ns,
      replicas: dep.replicas, readyReplicas: 0,
      availableReplicas: 0, updatedReplicas: dep.replicas,
      health: 'Critical', createdAt: now, labels: selector, selector,
      images: [`registry.example.com/${dep.name}:latest`],
    });
    for (let i = 0; i < dep.replicas; i++) {
      const suffix    = stableSuffix(`incident/${dep.ns}/${dep.name}/${i}`);
      // For OOM incidents, keep memPct firmly above the 90% threshold
      const memPct    = dep.crashLoop || dep.restarts ? fluctuate(dep.memPct) : Math.max(93, fluctuate(dep.memPct));
      const memLimitMi = 512;
      const crashLoop = dep.crashLoop || false;
      const restarts  = dep.restarts  || (crashLoop ? 14 : 0);
      const status    = crashLoop ? 'Running' : podStatus(memPct);
      pods.push({
        name: `${dep.name}-${suffix}`,
        namespace: dep.ns,
        nodeName: nodeNames[nodeIdx % nodeNames.length],
        status, ready: false, restarts, crashLoop,
        containers: [{ name: dep.name, image: `registry.example.com/${dep.name}:latest` }],
        createdAt: now,
        labels: { app: dep.name, env: dep.ns },
        ownerKind: 'ReplicaSet', ownerName: `${dep.name}-${suffix}`,
        cpuLimit: '200m', memLimit: `${memLimitMi}Mi`,
        memLimitBytes: memLimitMi * 1024 * 1024,
        cpuRequest: '50m', memRequest: '128Mi',
        cpu: `${Math.round(10 + Math.random() * 80)}m`,
        memory: `${Math.round(memLimitMi * memPct / 100)}Mi`,
        memPct,
      });
      nodeIdx++;
    }
  }

  const namespaces = NAMESPACES.map(name => ({
    name,
    status: 'Active',
    createdAt: now,
    labels: {},
  }));

  const nodes = NODES.map(n => ({
    name: n.name,
    status: 'Ready',
    roles: ['worker'],
    capacity:    { cpu: 4000, memory: 8 * 1024 * 1024 * 1024 },
    allocatable: { cpu: 3800, memory: 7 * 1024 * 1024 * 1024 },
    version: 'v1.31.0',
    os: 'Ubuntu 24.04 LTS',
    arch: 'amd64',
    containerRuntime: 'containerd://2.0.0',
    createdAt: now,
    conditions: [{ type: 'Ready', status: 'True', reason: 'KubeletReady' }],
  }));

  return {
    clusterName: 'demo-cluster',
    nodes,
    namespaces,
    pods,
    deployments,
    updatedAt: now,
  };
}

export function getDemoLogs(podName) {
  const lines = [];
  const now = Date.now();
  for (let i = 99; i >= 0; i--) {
    const t = new Date(now - i * 2000).toISOString();
    const levels = ['INFO', 'INFO', 'INFO', 'WARN', 'DEBUG'];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const msgs = [
      'Request processed successfully',
      'Health check passed',
      'Connected to upstream service',
      'Cache hit ratio: 94%',
      'Scheduled job triggered',
      'Metrics flushed to collector',
      'Config reloaded from ConfigMap',
      'TLS certificate valid for 89 days',
    ];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    lines.push(`${t} ${level} [${podName}] ${msg}`);
  }
  return lines.join('\n');
}
