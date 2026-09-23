// Synthetic demo cluster — no real Kubernetes needed
const NAMESPACES = ['production', 'staging', 'monitoring', 'kube-system', 'ingress', 'logging'];

const DEPLOYMENTS = [
  // production — all below 45% → always green
  { name: 'api-gateway',      ns: 'production', replicas: 3, memPct: 38 },
  { name: 'auth-service',     ns: 'production', replicas: 2, memPct: 32 },
  { name: 'worker',           ns: 'production', replicas: 5, memPct: 44 },
  { name: 'scheduler',        ns: 'production', replicas: 1, memPct: 22 },
  { name: 'notifier',         ns: 'production', replicas: 2, memPct: 28 },
  { name: 'data-sync',        ns: 'production', replicas: 1, memPct: 35 },
  { name: 'event-processor',  ns: 'production', replicas: 2, memPct: 41 },
  // staging
  { name: 'api-gateway',      ns: 'staging',    replicas: 1, memPct: 20 },
  { name: 'auth-service',     ns: 'staging',    replicas: 1, memPct: 15 },
  { name: 'worker',           ns: 'staging',    replicas: 2, memPct: 30 },
  { name: 'event-handler',    ns: 'staging',    replicas: 1, memPct: 25 },
  // monitoring
  { name: 'prometheus',       ns: 'monitoring', replicas: 1, memPct: 40 },
  { name: 'grafana',          ns: 'monitoring', replicas: 1, memPct: 28 },
  { name: 'alertmanager',     ns: 'monitoring', replicas: 1, memPct: 18 },
  // kube-system
  { name: 'coredns',          ns: 'kube-system', replicas: 2, memPct: 18 },
  { name: 'metrics-server',   ns: 'kube-system', replicas: 1, memPct: 12 },
  { name: 'cilium',           ns: 'kube-system', replicas: 2, memPct: 26 },
  // ingress
  { name: 'ingress-nginx',    ns: 'ingress',    replicas: 2, memPct: 35 },
  { name: 'cert-manager',     ns: 'ingress',    replicas: 1, memPct: 16 },
  // logging
  { name: 'loki',             ns: 'logging',    replicas: 1, memPct: 38 },
  { name: 'promtail',         ns: 'logging',    replicas: 2, memPct: 22 },
];

const NODES = [
  { name: 'k8s-node-01', pods: 40 },
  { name: 'k8s-node-02', pods: 35 },
  { name: 'k8s-node-03', pods: 28 },
];

const STATEFULSETS = [
  { name: 'postgres',      ns: 'production', replicas: 3 },
  { name: 'redis',         ns: 'production', replicas: 3 },
  { name: 'elasticsearch', ns: 'logging',    replicas: 3 },
  { name: 'mongodb',       ns: 'staging',    replicas: 2 },
];

const DAEMONSETS = [
  { name: 'node-exporter', ns: 'monitoring',  desired: 3 },
  { name: 'promtail',      ns: 'logging',     desired: 3 },
  { name: 'cilium-agent',  ns: 'kube-system', desired: 3 },
];

const CRONJOBS = [
  { name: 'db-backup',    ns: 'production', schedule: '0 2 * * *',    lastSuccess: true  },
  { name: 'cache-flush',  ns: 'production', schedule: '*/30 * * * *', lastSuccess: true  },
  { name: 'log-cleanup',  ns: 'logging',    schedule: '0 0 * * 0',    lastSuccess: false },
  { name: 'cert-renewal', ns: 'ingress',    schedule: '0 12 * * *',   lastSuccess: true  },
];

const CONFIGMAPS = [
  { name: 'api-config',        ns: 'production', keys: ['PORT', 'LOG_LEVEL', 'CACHE_TTL', 'MAX_CONNECTIONS'] },
  { name: 'worker-config',     ns: 'production', keys: ['QUEUE_SIZE', 'BATCH_SIZE', 'RETRY_LIMIT'] },
  { name: 'nginx-config',      ns: 'ingress',    keys: ['nginx.conf', 'proxy.conf'] },
  { name: 'prometheus-config', ns: 'monitoring', keys: ['prometheus.yml', 'alerting.yml'] },
  { name: 'loki-config',       ns: 'logging',    keys: ['loki.yaml'] },
  { name: 'staging-config',    ns: 'staging',    keys: ['PORT', 'LOG_LEVEL', 'FEATURE_FLAGS'] },
];

const SECRETS = [
  { name: 'db-credentials',   ns: 'production', type: 'Opaque',                          keys: ['username', 'password', 'host'] },
  { name: 'api-tls',          ns: 'production', type: 'kubernetes.io/tls',                keys: ['tls.crt', 'tls.key'] },
  { name: 'registry-creds',   ns: 'production', type: 'kubernetes.io/dockerconfigjson',  keys: ['.dockerconfigjson'] },
  { name: 'monitoring-token', ns: 'monitoring', type: 'Opaque',                          keys: ['token'] },
  { name: 'ingress-tls',      ns: 'ingress',    type: 'kubernetes.io/tls',                keys: ['tls.crt', 'tls.key'] },
  { name: 'staging-db',       ns: 'staging',    type: 'Opaque',                          keys: ['username', 'password'] },
];

// Incident pool — each entry defines a pod and its alert failure mode
// Two pods are picked per cycle: one goes orange then stays, the other escalates to alert
const INCIDENT_POOL = [
  { name: 'payment-service',         ns: 'production',  replicas: 2, crashLoop: false, restarts: 0  },
  { name: 'recommender',             ns: 'staging',     replicas: 1, crashLoop: true,  restarts: 0  },
  { name: 'vector',                  ns: 'logging',     replicas: 1, crashLoop: false, restarts: 11 },
  { name: 'redis-cache',             ns: 'production',  replicas: 1, crashLoop: false, restarts: 0  },
  { name: 'kube-proxy',              ns: 'kube-system', replicas: 2, crashLoop: true,  restarts: 0  },
  { name: 'tracing-agent',           ns: 'monitoring',  replicas: 1, crashLoop: false, restarts: 9  },
  { name: 'load-tester',             ns: 'staging',     replicas: 3, crashLoop: false, restarts: 0  },
  { name: 'ingress-default-backend', ns: 'ingress',     replicas: 1, crashLoop: true,  restarts: 0  },
  { name: 'thanos-compactor',        ns: 'monitoring',  replicas: 1, crashLoop: false, restarts: 7  },
  { name: 'batch-processor',         ns: 'production',  replicas: 4, crashLoop: false, restarts: 0  },
];

// Cycle phases (3 min total):
//   0–60s  : calm       — all pods green
//   60–90s : degraded   — podA orange (memPct ~65), podB red (memPct ~85), both Running
//   90–150s: alert      — podB escalates to Failed/CrashLoop → toast raised
//   150–180s: recovery  — both pods gone → auto-recover
const CYCLE_MS      = 3 * 60 * 1000;
const PHASE_CALM    = 60  * 1000;
const PHASE_DEGRADE = 90  * 1000;
const PHASE_ALERT   = 150 * 1000;

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

export function getDemoData(connectedAt = 0) {
  const now      = new Date().toISOString();
  // Phase is relative to when this client connected, so a fresh reload always starts calm
  const elapsed  = connectedAt > 0 ? Date.now() - connectedAt : Date.now() % CYCLE_MS;
  const phaseMs  = elapsed % CYCLE_MS;
  const waveIdx  = Math.floor(elapsed / CYCLE_MS);

  // Which phase are we in?
  const phase = phaseMs < PHASE_CALM    ? 'calm'
              : phaseMs < PHASE_DEGRADE ? 'degrade'
              : phaseMs < PHASE_ALERT   ? 'alert'
              : 'recovery';

  // Two incident pods per wave (from different namespaces when possible)
  const podA = INCIDENT_POOL[waveIdx % INCIDENT_POOL.length];
  const podB = INCIDENT_POOL[(waveIdx + 1) % INCIDENT_POOL.length];

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

  // Helper: inject a degraded pod (orange or red, no alert)
  function injectDegraded(dep, targetMemPct) {
    const selector = { app: dep.name, env: dep.ns };
    deployments.push({
      name: dep.name, namespace: dep.ns,
      replicas: dep.replicas, readyReplicas: dep.replicas,
      availableReplicas: dep.replicas, updatedReplicas: dep.replicas,
      health: 'Degraded', createdAt: now, labels: selector, selector,
      images: [`registry.example.com/${dep.name}:latest`],
    });
    for (let i = 0; i < dep.replicas; i++) {
      const suffix     = stableSuffix(`incident/${dep.ns}/${dep.name}/${i}`);
      const memPct     = fluctuate(targetMemPct);
      const memLimitMi = 512;
      pods.push({
        name: `${dep.name}-${suffix}`, namespace: dep.ns,
        nodeName: nodeNames[nodeIdx % nodeNames.length],
        status: 'Running', ready: true, restarts: 0, crashLoop: false,
        containers: [{ name: dep.name, image: `registry.example.com/${dep.name}:latest` }],
        createdAt: now, labels: { app: dep.name, env: dep.ns },
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

  // Helper: inject an alerting pod (Failed / CrashLoop / high restarts)
  function injectAlert(dep) {
    const selector = { app: dep.name, env: dep.ns };
    deployments.push({
      name: dep.name, namespace: dep.ns,
      replicas: dep.replicas, readyReplicas: 0,
      availableReplicas: 0, updatedReplicas: dep.replicas,
      health: 'Critical', createdAt: now, labels: selector, selector,
      images: [`registry.example.com/${dep.name}:latest`],
    });
    for (let i = 0; i < dep.replicas; i++) {
      const suffix     = stableSuffix(`incident/${dep.ns}/${dep.name}/${i}`);
      const memLimitMi = 512;
      const crashLoop  = dep.crashLoop;
      const restarts   = dep.restarts || (crashLoop ? 14 : 0);
      // OOM: keep memPct firmly above 90 ; CrashLoop/restarts: normal range
      const memPct     = crashLoop || dep.restarts ? fluctuate(60) : Math.max(93, fluctuate(95));
      const status     = crashLoop ? 'Running' : 'Failed';
      pods.push({
        name: `${dep.name}-${suffix}`, namespace: dep.ns,
        nodeName: nodeNames[nodeIdx % nodeNames.length],
        status, ready: false, restarts, crashLoop,
        containers: [{ name: dep.name, image: `registry.example.com/${dep.name}:latest` }],
        createdAt: now, labels: { app: dep.name, env: dep.ns },
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

  // Phase-based injection
  if (phase === 'degrade') {
    injectDegraded(podA, 65); // orange
    injectDegraded(podB, 84); // red (no alert yet)
  } else if (phase === 'alert') {
    injectDegraded(podA, 65); // podA stays orange
    injectAlert(podB);        // podB escalates → toast
  }
  // calm / recovery: nothing injected → pods absent → auto-recover if needed

  // StatefulSets + their pods
  const statefulSets = STATEFULSETS.map(sts => {
    for (let i = 0; i < sts.replicas; i++) {
      const podName    = `${sts.name}-${i}`;
      const memPct     = fluctuate(35);
      const memLimitMi = 1024;
      pods.push({
        name: podName, namespace: sts.ns,
        nodeName: nodeNames[nodeIdx % nodeNames.length],
        status: 'Running', ready: true, restarts: 0, crashLoop: false,
        containers: [{ name: sts.name, image: `registry.example.com/${sts.name}:latest` }],
        createdAt: now, labels: { app: sts.name },
        ownerKind: 'StatefulSet', ownerName: sts.name,
        cpuLimit: '500m', memLimit: `${memLimitMi}Mi`,
        memLimitBytes: memLimitMi * 1024 * 1024,
        cpuRequest: '100m', memRequest: '256Mi',
        cpu: `${Math.round(50 + Math.random() * 200)}m`,
        memory: `${Math.round(memLimitMi * memPct / 100)}Mi`,
        memPct,
      });
      nodeIdx++;
    }
    return {
      name: sts.name, namespace: sts.ns,
      replicas: sts.replicas, readyReplicas: sts.replicas,
      health: 'Healthy', createdAt: now,
      labels: { app: sts.name }, selector: { app: sts.name },
      serviceName: sts.name,
      images: [`registry.example.com/${sts.name}:latest`],
    };
  });

  // DaemonSets + their pods
  const daemonSets = DAEMONSETS.map(ds => {
    for (let i = 0; i < ds.desired; i++) {
      const suffix     = stableSuffix(`ds/${ds.ns}/${ds.name}/${i}`);
      const memPct     = fluctuate(20);
      const memLimitMi = 256;
      pods.push({
        name: `${ds.name}-${suffix}`, namespace: ds.ns,
        nodeName: nodeNames[i % nodeNames.length],
        status: 'Running', ready: true, restarts: 0, crashLoop: false,
        containers: [{ name: ds.name, image: `registry.example.com/${ds.name}:latest` }],
        createdAt: now, labels: { app: ds.name },
        ownerKind: 'DaemonSet', ownerName: ds.name,
        cpuLimit: '200m', memLimit: `${memLimitMi}Mi`,
        memLimitBytes: memLimitMi * 1024 * 1024,
        cpuRequest: '25m', memRequest: '64Mi',
        cpu: `${Math.round(5 + Math.random() * 20)}m`,
        memory: `${Math.round(memLimitMi * memPct / 100)}Mi`,
        memPct,
      });
      nodeIdx++;
    }
    return {
      name: ds.name, namespace: ds.ns,
      desired: ds.desired, ready: ds.desired,
      health: 'Healthy', createdAt: now,
      labels: { app: ds.name }, selector: { app: ds.name },
      images: [`registry.example.com/${ds.name}:latest`],
    };
  });

  const nowTs = Date.now();
  const cronJobs = CRONJOBS.map(cj => ({
    name: cj.name, namespace: cj.ns,
    schedule: cj.schedule, suspended: false, active: false,
    lastScheduleTime: new Date(nowTs - 3_600_000).toISOString(),
    lastSuccessTime:  cj.lastSuccess ? new Date(nowTs - 3_600_000).toISOString() : null,
    createdAt: now, labels: { app: cj.name },
    images: [`registry.example.com/${cj.name}:latest`],
  }));

  const configMaps = CONFIGMAPS.map(cm => ({
    name: cm.name, namespace: cm.ns, keys: cm.keys, createdAt: now,
  }));

  const secrets = SECRETS.map(s => ({
    name: s.name, namespace: s.ns, type: s.type, keys: s.keys, createdAt: now,
  }));

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
    nodes, namespaces, pods, deployments,
    statefulSets, daemonSets, cronJobs, configMaps, secrets,
    updatedAt: now,
  };
}

// Demo events — realistic sequences based on pod failure type
export function getDemoEvents(namespace, podName) {
  const now   = Date.now();
  const ago   = (s) => new Date(now - s * 1000).toISOString();

  // Identify pod type from name
  const base = podName.replace(/-[a-z0-9]{5}$/, '');
  const dep   = [...DEPLOYMENTS, ...INCIDENT_POOL].find(d => d.name === base && d.ns === namespace);

  const isCrashLoop = dep?.crashLoop;
  const isOOM       = dep && !dep.crashLoop && !dep.restarts && (dep.memPct || 0) > 90;
  const isRestarts  = dep?.restarts >= 5;

  const image = `registry.example.com/${base}:latest`;

  // Base events every pod has
  const events = [
    { time: ago(600), type: 'Normal',  reason: 'Scheduled',  message: `Successfully assigned ${namespace}/${podName} to k8s-node-01`, count: 1 },
    { time: ago(598), type: 'Normal',  reason: 'Pulling',    message: `Pulling image "${image}"`, count: 1 },
    { time: ago(595), type: 'Normal',  reason: 'Pulled',     message: `Successfully pulled image "${image}" in 2.847s`, count: 1 },
    { time: ago(594), type: 'Normal',  reason: 'Created',    message: `Created container ${base}`, count: 1 },
    { time: ago(593), type: 'Normal',  reason: 'Started',    message: `Started container ${base}`, count: 1 },
  ];

  if (isCrashLoop) {
    events.push(
      { time: ago(580), type: 'Warning', reason: 'BackOff',   message: `Back-off restarting failed container ${base} in pod ${podName}`, count: 3 },
      { time: ago(420), type: 'Warning', reason: 'BackOff',   message: `Back-off restarting failed container ${base} in pod ${podName}`, count: 8 },
      { time: ago(240), type: 'Warning', reason: 'BackOff',   message: `Back-off restarting failed container ${base} in pod ${podName}`, count: 14 },
      { time: ago(60),  type: 'Warning', reason: 'BackOff',   message: `Back-off restarting failed container ${base} in pod ${podName}`, count: 21 },
    );
  } else if (isOOM) {
    events.push(
      { time: ago(480), type: 'Warning', reason: 'OOMKilling',  message: `Memory limit reached. Killing container ${base} with 512Mi of memory limit, which may cause pod to be OOMKilled.`, count: 1 },
      { time: ago(300), type: 'Warning', reason: 'OOMKilling',  message: `Memory limit reached. Killing container ${base} with 512Mi of memory limit, which may cause pod to be OOMKilled.`, count: 2 },
      { time: ago(120), type: 'Warning', reason: 'BackOff',     message: `Back-off restarting failed container ${base} in pod ${podName}`, count: 4 },
    );
  } else if (isRestarts) {
    events.push(
      { time: ago(500), type: 'Warning', reason: 'Unhealthy',  message: `Liveness probe failed: HTTP probe failed with statuscode: 500`, count: 2 },
      { time: ago(380), type: 'Warning', reason: 'Unhealthy',  message: `Liveness probe failed: HTTP probe failed with statuscode: 500`, count: 5 },
      { time: ago(200), type: 'Warning', reason: 'BackOff',    message: `Back-off restarting failed container ${base} in pod ${podName}`, count: dep.restarts },
    );
  } else {
    // Healthy pod — only normal events + optional readiness
    events.push(
      { time: ago(590), type: 'Normal', reason: 'Pulling',   message: `Pulling image "${image}"`, count: 1 },
    );
  }

  return events.sort((a, b) => new Date(a.time) - new Date(b.time));
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
