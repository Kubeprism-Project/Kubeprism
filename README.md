# Kubeprism

A real-time 3D Kubernetes cluster visualization dashboard built with React Three Fiber.

## Features

- **3D visualization** — Nodes, Namespaces, Deployments and Pods rendered as interactive rotating cubes
- **Two view modes** — Cluster (Nodes → Pods) or Namespaces (Namespaces → Deployments → Pods)
- **Real-time updates** — WebSocket push every 5 seconds
- **Memory & CPU metrics** — Live usage via `metrics-server` with color-coded health propagation
- **Color coding** — Fill = memory usage, Edges = pod status (green / orange / red)
- **Health propagation** — Pod status bubbles up to Deployment → Namespace → Node → Root view
- **Log streaming** — Live pod logs with syntax highlighting, pause and clear
- **Multi-cluster** — Upload kubeconfigs, switch clusters at runtime (TLS bypass option)
- **Bloom & stars** — Post-processing effects via `@react-three/postprocessing`

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Three Fiber, Three.js, Zustand, Vite |
| 3D | `@react-three/drei`, `@react-spring/three`, `@react-three/postprocessing` |
| Backend | Node.js, Express, WebSocket (`ws`) |
| Kubernetes | `@kubernetes/client-node` v0.21 |

## Requirements

- Node.js 18+
- A Kubernetes cluster with a valid `kubeconfig`
- `metrics-server` installed in the cluster (optional — for CPU/memory display)

## Getting Started

### Backend

```bash
cd backend
npm install
npm start          # production
npm run dev        # watch mode
```

The Kubeprism backend listens on `http://localhost:3001`.

It loads the default kubeconfig from `~/.kube/config` on startup.

### Frontend

```bash
cd frontend
npm install
npm run dev        # dev server on http://localhost:5173
npm run build      # production build → frontend/dist/
```

## Multi-cluster

Kubeconfigs are stored in `backend/kubeconfigs/` (excluded from git).

To add a cluster:
1. Click the **K8S** button in the left sidebar
2. Enter a name, optionally check *Bypass TLS verification*
3. Upload the kubeconfig YAML file
4. Click **Activer** to switch to it

## Project Structure

```
kubeprism/
├── backend/
│   ├── src/
│   │   ├── server.js       # Express + WebSocket server
│   │   └── k8s.js          # Kubernetes client, data helpers, metrics
│   └── kubeconfigs/        # Stored kubeconfigs (gitignored)
└── frontend/
    └── src/
        ├── App.jsx                     # Canvas, camera presets, scene routing
        ├── store/useStore.js           # Zustand global state
        ├── hooks/useWebSocket.js       # WS connection + reconnect
        ├── utils/
        │   ├── api.js                  # Shared API/WS URL constants
        │   └── podColors.js            # Color helpers (memory fill, status edge)
        └── components/
            ├── RootScene.jsx           # View selector (Cluster / Namespaces)
            ├── ClusterScene.jsx        # Node cubes
            ├── NodeScene.jsx           # Pod cubes for a node
            ├── NamespacesRootScene.jsx # Namespace cubes
            ├── NamespaceScene.jsx      # Deployment cubes for a namespace
            ├── DeploymentScene.jsx     # Pod cubes for a deployment
            ├── PodCube.jsx             # Shared pod cube component
            ├── CubeObject.jsx          # Base 3D cube with edges
            ├── HUD.jsx                 # Overlay UI (stats, zoom track, back)
            ├── Sidebar.jsx             # Left sidebar (cluster manager, about)
            ├── LogModal.jsx            # Live pod log viewer
            ├── ClusterManagerModal.jsx # Add / activate / delete clusters
            └── AboutModal.jsx          # App info
```

## License

MIT
