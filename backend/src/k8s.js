import * as k8s from '@kubernetes/client-node';
import https from 'https';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getDemoData, getDemoLogs } from './demo.js';

// Persist kubeconfigs next to this file
const CONFIGS_DIR = path.resolve('./kubeconfigs');
if (!fs.existsSync(CONFIGS_DIR)) fs.mkdirSync(CONFIGS_DIR, { recursive: true });

// --- Dynamic clients ---
let activeClusterName = 'demo'; // demo cluster is the default
let kc            = new k8s.KubeConfig();
let coreV1Api     = null;
let appsV1Api     = null;
let customApi     = null;
let logHelper     = null;

const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
  minVersion: 'TLSv1',
});

function initClients(kubeConfig, skipTLS = false) {
  kc        = kubeConfig;

  if (skipTLS) {
    // Disable TLS verification at process level — most reliable method with the request module
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('[K8S] TLS verification disabled for this cluster');
  }

  coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
  appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
  customApi = kc.makeApiClient(k8s.CustomObjectsApi);
  logHelper = new k8s.Log(kc);
}

// Boot: try to load real kubeconfig, fall back to demo cluster
try {
  const boot = new k8s.KubeConfig();
  boot.loadFromDefault();
  initClients(boot);
  activeClusterName = 'default';
  console.log('[K8S] Loaded default kubeconfig');
} catch (err) {
  console.warn('[K8S] No default kubeconfig, starting in demo mode:', err.message);
}

// --- Cluster management ---

export function listClusters() {
  const saved = fs.existsSync(CONFIGS_DIR)
    ? fs.readdirSync(CONFIGS_DIR)
        .filter(f => f.endsWith('.yaml'))
        .map(f => f.replace('.yaml', ''))
    : [];
  return ['demo', 'default', ...saved];
}

export function getActiveCluster() {
  return activeClusterName;
}

export function addCluster(name, yamlContent, skipTLS = false) {
  if (name === 'demo' || name === 'default') throw new Error(`Cannot overwrite built-in cluster "${name}"`);
  let content = yamlContent;
  if (skipTLS) {
    try {
      const config = yaml.load(yamlContent);
      for (const cluster of config.clusters || []) {
        if (cluster.cluster) {
          cluster.cluster['insecure-skip-tls-verify'] = true;
          delete cluster.cluster['certificate-authority-data'];
          delete cluster.cluster['certificate-authority'];
        }
      }
      content = yaml.dump(config, { lineWidth: -1 });
    } catch (e) {
      console.warn('[K8S] Could not patch TLS in kubeconfig:', e.message);
    }
  }
  fs.writeFileSync(path.join(CONFIGS_DIR, `${name}.yaml`), content, 'utf8');
}

export function removeCluster(name) {
  if (name === 'demo' || name === 'default') throw new Error(`Cannot remove built-in cluster "${name}"`);
  const file = path.join(CONFIGS_DIR, `${name}.yaml`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  if (activeClusterName === name) {
    const boot = new k8s.KubeConfig();
    boot.loadFromDefault();
    initClients(boot);
    activeClusterName = 'default';
  }
}

export function activateCluster(name) {
  if (name === 'demo') {
    activeClusterName = 'demo';
    console.log('[K8S] Activating demo cluster');
    return;
  }

  const newKc = new k8s.KubeConfig();
  let skipTLS = false;

  if (name === 'default') {
    newKc.loadFromDefault();
  } else {
    const file = path.join(CONFIGS_DIR, `${name}.yaml`);
    if (!fs.existsSync(file)) throw new Error(`Cluster "${name}" not found`);
    newKc.loadFromFile(file);
    // Detect if any cluster in this kubeconfig has insecure-skip-tls-verify
    try {
      const raw = yaml.load(fs.readFileSync(file, 'utf8'));
      skipTLS = (raw.clusters || []).some(c => c.cluster?.['insecure-skip-tls-verify']);
    } catch {}
  }

  const server = newKc.getCurrentCluster()?.server || '?';
  console.log(`[K8S] Activating cluster: ${name} → ${server} (skipTLS=${skipTLS})`);

  initClients(newKc, skipTLS);
  activeClusterName = name;
}

// --- Data helpers ---

function parseCpuNano(cpu) {
  if (!cpu) return 0;
  if (cpu.endsWith('n')) return parseInt(cpu);
  if (cpu.endsWith('m')) return parseInt(cpu) * 1_000_000;
  return parseInt(cpu) * 1_000_000_000;
}

function formatCpuUsage(nano) {
  const m = Math.round(nano / 1_000_000);
  return m < 1 ? '<1m' : `${m}m`;
}

function formatMemUsage(bytes) {
  const mi = Math.round(bytes / (1024 * 1024));
  return mi < 1 ? '<1Mi' : `${mi}Mi`;
}

async function getPodMetrics() {
  try {
    const res = await customApi.listClusterCustomObject('metrics.k8s.io', 'v1beta1', 'pods');
    const map = {};
    for (const item of res.body.items || []) {
      const key = `${item.metadata.namespace}/${item.metadata.name}`;
      let cpuNano = 0, memBytes = 0;
      for (const c of item.containers || []) {
        cpuNano  += parseCpuNano(c.usage?.cpu);
        memBytes += parseMemory(c.usage?.memory);
      }
      map[key] = { cpu: formatCpuUsage(cpuNano), memory: formatMemUsage(memBytes), memBytes };
    }
    return map;
  } catch {
    return {};
  }
}

function parseMemory(mem) {
  if (!mem) return 0;
  if (mem.endsWith('Ki')) return parseInt(mem) * 1024;
  if (mem.endsWith('Mi')) return parseInt(mem) * 1024 * 1024;
  if (mem.endsWith('Gi')) return parseInt(mem) * 1024 * 1024 * 1024;
  return parseInt(mem);
}

function parseCpu(cpu) {
  if (!cpu) return 0;
  if (cpu.endsWith('m')) return parseInt(cpu);
  return parseInt(cpu) * 1000;
}

function formatNode(node) {
  const conditions = node.status?.conditions || [];
  const ready = conditions.find(c => c.type === 'Ready');
  const roles = Object.keys(node.metadata.labels || {})
    .filter(k => k.startsWith('node-role.kubernetes.io/'))
    .map(k => k.replace('node-role.kubernetes.io/', ''));
  return {
    name: node.metadata.name,
    status: ready?.status === 'True' ? 'Ready' : 'NotReady',
    roles: roles.length ? roles : ['worker'],
    capacity:    { cpu: parseCpu(node.status?.capacity?.cpu),    memory: parseMemory(node.status?.capacity?.memory) },
    allocatable: { cpu: parseCpu(node.status?.allocatable?.cpu), memory: parseMemory(node.status?.allocatable?.memory) },
    version: node.status?.nodeInfo?.kubeletVersion || 'unknown',
    os:      node.status?.nodeInfo?.osImage        || 'unknown',
    arch:    node.status?.nodeInfo?.architecture   || 'unknown',
    containerRuntime: node.status?.nodeInfo?.containerRuntimeVersion || 'unknown',
    createdAt:  node.metadata.creationTimestamp,
    conditions: conditions.map(c => ({ type: c.type, status: c.status, reason: c.reason })),
  };
}

function formatNamespace(ns) {
  return {
    name:      ns.metadata.name,
    status:    ns.status?.phase || 'Active',
    createdAt: ns.metadata.creationTimestamp,
    labels:    ns.metadata.labels || {},
  };
}

function formatPod(pod) {
  const containerStatuses = pod.status?.containerStatuses || [];
  const allReady  = containerStatuses.every(c => c.ready);
  const restarts  = containerStatuses.reduce((sum, c) => sum + (c.restartCount || 0), 0);
  const crashLoop = containerStatuses.some(c => c.state?.waiting?.reason === 'CrashLoopBackOff');

  const containers = pod.spec?.containers || [];
  let cpuLimitNano = 0, memLimitBytes = 0;
  let cpuReqNano   = 0, memReqBytes   = 0;
  let hasLimits = false, hasRequests = false;
  for (const c of containers) {
    if (c.resources?.limits?.cpu)    { cpuLimitNano  += parseCpuNano(c.resources.limits.cpu);    hasLimits   = true; }
    if (c.resources?.limits?.memory) { memLimitBytes += parseMemory(c.resources.limits.memory);  hasLimits   = true; }
    if (c.resources?.requests?.cpu)    { cpuReqNano  += parseCpuNano(c.resources.requests.cpu);    hasRequests = true; }
    if (c.resources?.requests?.memory) { memReqBytes += parseMemory(c.resources.requests.memory);  hasRequests = true; }
  }

  return {
    name:      pod.metadata.name,
    namespace: pod.metadata.namespace,
    nodeName:  pod.spec?.nodeName,
    status:    pod.status?.phase || 'Unknown',
    ready:     allReady,
    restarts,
    containers: containers.map(c => ({ name: c.name, image: c.image })),
    createdAt:  pod.metadata.creationTimestamp,
    labels:     pod.metadata.labels || {},
    ownerKind:  pod.metadata.ownerReferences?.[0]?.kind,
    ownerName:  pod.metadata.ownerReferences?.[0]?.name,
    crashLoop,
    cpuLimit:     hasLimits   && cpuLimitNano  > 0 ? formatCpuUsage(cpuLimitNano)  : null,
    memLimit:     hasLimits   && memLimitBytes > 0 ? formatMemUsage(memLimitBytes) : null,
    memLimitBytes: memLimitBytes > 0 ? memLimitBytes : null,
    cpuRequest:   hasRequests && cpuReqNano    > 0 ? formatCpuUsage(cpuReqNano)    : null,
    memRequest:   hasRequests && memReqBytes   > 0 ? formatMemUsage(memReqBytes)   : null,
  };
}

function formatDeployment(dep) {
  const replicas          = dep.spec?.replicas          || 0;
  const readyReplicas     = dep.status?.readyReplicas   || 0;
  const availableReplicas = dep.status?.availableReplicas || 0;
  const updatedReplicas   = dep.status?.updatedReplicas || 0;
  let health = 'Healthy';
  if (readyReplicas === 0 && replicas > 0) health = 'Critical';
  else if (readyReplicas < replicas)        health = 'Degraded';
  return {
    name: dep.metadata.name,
    namespace: dep.metadata.namespace,
    replicas, readyReplicas, availableReplicas, updatedReplicas,
    health,
    createdAt: dep.metadata.creationTimestamp,
    labels:    dep.metadata.labels || {},
    selector:  dep.spec?.selector?.matchLabels || {},
    images:    dep.spec?.template?.spec?.containers?.map(c => c.image) || [],
  };
}

export async function getClusterData() {
  if (activeClusterName === 'demo') return getDemoData();

  const [nodes, namespaces, pods, deployments, metrics] = await Promise.all([
    coreV1Api.listNode(),
    coreV1Api.listNamespace(),
    coreV1Api.listPodForAllNamespaces(),
    appsV1Api.listDeploymentForAllNamespaces(),
    getPodMetrics(),
  ]);
  return {
    clusterName: activeClusterName,
    nodes:       nodes.body.items.map(formatNode),
    namespaces:  namespaces.body.items.map(formatNamespace),
    pods:        pods.body.items.map(pod => {
      const f = formatPod(pod);
      const m = metrics[`${f.namespace}/${f.name}`];
      if (m) {
        f.cpu = m.cpu;
        f.memory = m.memory;
        if (f.memLimitBytes && m.memBytes > 0) {
          f.memPct = Math.min(100, Math.round(m.memBytes / f.memLimitBytes * 100));
        }
      }
      return f;
    }),
    deployments: deployments.body.items.map(formatDeployment),
    updatedAt:   new Date().toISOString(),
  };
}

export async function getLogs(namespace, podName, container, tailLines = 200) {
  if (activeClusterName === 'demo') return getDemoLogs(podName);
  const result = await coreV1Api.readNamespacedPodLog(
    podName, namespace, container || undefined,
    undefined, undefined, undefined, undefined, undefined, undefined,
    tailLines, true,
  );
  return result.body || '';
}

export async function streamLogs(namespace, podName, container, sink) {
  if (activeClusterName === 'demo') {
    // Stream a few demo log lines then keep alive
    const lines = getDemoLogs(podName).split('\n');
    for (const line of lines) sink.write(line + '\n');
    const interval = setInterval(() => {
      const now = new Date().toISOString();
      sink.write(`${now} INFO [${podName}] Heartbeat OK\n`);
    }, 3000);
    return () => clearInterval(interval);
  }
  const req = await logHelper.log(namespace, podName, container || undefined, sink, {
    follow: true, tailLines: 100, pretty: false, timestamps: true,
  });
  return () => {
    try { req.destroy(); } catch {}
    try { sink.destroy(); } catch {}
  };
}
