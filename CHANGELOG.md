# Kubeprism — Changelog

## [0.0.2] - 2026-09-18

### Added

#### Alert Notifications
- **Alert badges** — red pulsing sphere on any cube (Pod / Deployment / Namespace / Node / Root) that has at least one pod in alert state
- **Alert count** displayed on the badge when more than one pod is in alert
- **Toast notifications** — slide-in toasts (bottom-left) triggered when a pod newly enters alert state (Failed, CrashLoopBackOff, or ≥ 5 restarts)
- Toasts auto-dismiss after 6 seconds and stack up to 5 visible at once
- Health propagation now surfaces through the full hierarchy: Pod → Deployment → Namespace → Node → Root view
- `CrashLoopBackOff` detection via container waiting reason in backend
- Demo cluster includes `data-sync` (CrashLoop) and `loki` (7 restarts) to demonstrate alerts

#### Technical
- `utils/alerts.js` — shared `isAlertPod()` and `alertCount()` helpers
- `AlertBadge` 3D component — reusable pulsing sphere, position driven by `cubeHalf` prop
- `AlertToast` component — tracks previous alert state, only toasts on *new* failures

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
