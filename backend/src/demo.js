// Synthetic demo cluster — no real Kubernetes needed
const NAMESPACES = ['production', 'staging', 'monitoring', 'kube-system', 'ingress', 'logging'];

const DEPLOYMENTS = [
  // production
  { name: 'api-gateway',      ns: 'production', replicas: 3, memPct: 62 },
  { name: 'auth-service',     ns: 'production', replicas: 2, memPct: 45 },
  { name: 'worker',           ns: 'production', replicas: 5, memPct: 78 },
  { name: 'scheduler',        ns: 'production', replicas: 1, memPct: 30 },
  { name: 'notifier',         ns: 'production', replicas: 2, memPct: 55 },
  { name: 'data-sync',        ns: 'production', replicas: 1, memPct: 88 },
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
  { name: 'loki',             ns: 'logging',    replicas: 1, memPct: 82 },
  { name: 'promtail',         ns: 'logging',    replicas: 2, memPct: 33 },
];

const NODES = [
  { name: 'k8s-node-01', pods: 40 },
  { name: 'k8s-node-02', pods: 35 },
  { name: 'k8s-node-03', pods: 28 },
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
  const now = new Date().toISOString();
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
      const status = podStatus(memPct);
      pods.push({
        name: `${dep.name}-${suffix}`,
        namespace: dep.ns,
        nodeName: nodeNames[nodeIdx % nodeNames.length],
        status,
        ready: status === 'Running',
        restarts: 0,
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
