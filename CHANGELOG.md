# Kubeprism — Changelog

## [0.0.2] - 2026-09-18

### Added

#### Alert Notifications
- **Alert badges (3D)** — red pulsing sphere on any cube that has at least one alerting pod, with counter when more than one
- Full propagation across all 5 navigation levels: Pod → Deployment → Namespace → Node → Root view
- **Toast notifications** — slide-in toasts (bottom-left) on newly alerting pods, stacked up to 5
- Toasts display the exact time the alert was raised (HH:MM:SS)
- Badge and toast share the same `activeAlerts` Zustand state — badge persists until the alert is dismissed, not just until the pod state changes
- Two dismiss modes:
  - **Manual**: user clicks ✕ → toast and badge disappear immediately
  - **Auto-recovery**: pod returns to healthy state → alert auto-dismissed across the whole hierarchy
- Alert criteria: `status === 'Failed'`, `crashLoop === true` (CrashLoopBackOff via container waiting reason), or `restarts >= 5`

#### Demo Scenario
- 3-minute cycle (resets on page reload) covering 10 incident scenarios across all namespaces:
  - 0–60s: all pods green
  - 60–90s: one pod turns orange, another turns red (degraded, no alert yet)
  - 90–150s: red pod escalates to Failed/CrashLoop → toast raised, badges propagated up
  - 150–180s: pod recovers → auto-dismiss, everything returns to green
- Incident types: OOMKilled, CrashLoopBackOff, restart storm, multi-pod failure, kube-system infra, ingress impact

#### Technical
- `utils/alerts.js` — `isAlertPod()` and `activeAlertCount(pods, activeAlerts)` helpers
- `AlertBadge` — 3D reusable component with `depthTest: false` to always render above rotating cubes
- `AlertToast` — drives `activeAlerts` store, manages recovery detection on each cluster data update
- Demo phase calculated relative to WebSocket `connectedAt` timestamp — reload always starts in calm phase

#### K8s Events
- **EVENTS tab** in LogModal — dedicated panel alongside LOGS, showing the event stream of any pod
- Events grid: timestamp · type (Normal/Warning) · reason · message · repeat count
- Color-coded by reason: `OOMKilling`, `BackOff`, `Failed` → red; `Unhealthy`, `FailedScheduling` → yellow; `Scheduled`, `Pulled`, `Started` → green
- REST endpoint `GET /api/pods/:namespace/:name/events` — real cluster via `listNamespacedEvent` fieldSelector
- Demo events: realistic sequences per incident type (CrashLoop → BackOff escalation, OOM kill, unhealthy probe, healthy lifecycle)

#### Global Search (Cmd+K)
- Instant search across all resources: pods, namespaces, deployments, nodes
- Keyboard navigation: ↑↓ arrows · Enter to open · Escape to close
- Type badges with contextual colors (NODE/NS/DEPLOY/POD), match highlighting
- Smart navigation: node → cluster view, namespace → ns view, deployment → dep view, pod → opens LogModal
- Cmd+K shortcut hint badge in HUD top bar

### Security

- Upgraded `@kubernetes/client-node` from 0.21.0 to 0.22.3
- Fixed **2 critical CVEs** and 1 high CVE in `jsonpath-plus` (Remote Code Execution — `jsonpath-plus` 8.1.0 → 10.4.0)
- Remaining 6 Dependabot alerts are inherited from the deprecated `request` library (still used by `@kubernetes/client-node` upstream) — not exploitable in this context as `request` is only used internally to call the Kubernetes API

---

## [0.0.1] - 2026-09-17

### Added

#### Core
- Real-time 3D Kubernetes visualization with React Three Fiber
- WebSocket push from backend every 5 seconds
- Two navigation modes: **Cluster** (Nodes → Pods) and **Namespaces** (Namespaces → Deployments → Pods)
- **Root scene** — 3D view selector with two interactive cubes (Cluster / Namespaces)
- Animated rotating cubes for all entities (nodes, namespaces, deployments, pods)
- Bloom post-processing and star field background

#### Health & Metrics
- CPU and memory usage per pod via `metrics-server` (`metrics.k8s.io/v1beta1`)
- Memory limits and requests extracted from pod spec
- `memPct` computed per pod (usage / limit × 100)
- **Fill color** = memory usage (green < 50% / orange 50–80% / red > 80%)
- **Edge color** = pod status (Running=green / Pending=orange / Failed=red)
- Health propagation: pod state bubbles up → Deployment → Namespace → Node → Root view

#### Multi-cluster
- Upload kubeconfig YAML files via the cluster manager modal
- Activate / delete clusters at runtime without restart
- Optional TLS bypass per cluster (`insecure-skip-tls-verify`)
- Kubeconfigs stored in `backend/kubeconfigs/` (gitignored)
- Navigation resets to Root view on cluster switch

#### Log Viewer
- Live pod log streaming via WebSocket
- Initial 100-line REST fetch + real-time tail
- Container selector for multi-container pods
- Pause / resume and clear controls
- Syntax-colored lines (error / warn / debug)
- Auto-scroll with pause support

#### UI
- Left sidebar with Cluster Manager and About modal
- HUD with stats panel (nodes, pods, deployments, namespaces)
- Zoom track navigation at bottom (clickable past levels)
- Back button for level navigation
- Connection status indicator (LIVE / OFFLINE)
- App version displayed in About modal

### Technical
- Zustand store for global navigation state
- `useWebSocket` hook with auto-reconnect and cleanup
- Shared `utils/podColors.js` for color helpers
- Shared `utils/api.js` for API/WS URL constants
- `podsForDeployment()` using full selector label matching
