import { create } from 'zustand';

export const useStore = create((set, get) => {
  if (import.meta.env.DEV) {
    setTimeout(() => { window.__store = useStore; }, 100);
  }
  return {
    // View mode: 'nodes' (Cluster→Node→NS→Dep→Pod) | 'namespaces' (NS→Dep→Pod)
    viewMode: 'nodes',

    // Navigation level
    level: 'root',
    selectedNode:       null,
    selectedNamespace:  null,
    selectedDeployment: null,
    selectedPod:        null,

    // Data
    clusterData: null,
    connected:   false,
    error:       null,

    setClusterData: (data) => set({ clusterData: data, error: null }),
    resetToRoot: () => set({ level: 'root', selectedNode: null, selectedNamespace: null, selectedDeployment: null, selectedPod: null, clusterData: null }),
    setConnected:   (c)    => set({ connected: c }),
    setError:       (e)    => set({ error: e }),

    openPodLogs:  (pod) => set({ selectedPod: pod }),
    closePodLogs: ()    => set({ selectedPod: null }),

    navigateTo: (level, context = {}) => set({ level, ...context }),

    // Switch between the two view modes, resetting navigation
    setViewMode: (mode) => set({
      viewMode:           mode,
      level:              mode === 'nodes' ? 'cluster' : 'ns-root',
      selectedNode:       null,
      selectedNamespace:  null,
      selectedDeployment: null,
      selectedPod:        null,
    }),

    navigateBack: () => {
      const { level, viewMode } = get();
      if (level === 'deployment') return set({ level: 'namespace', selectedDeployment: null, selectedPod: null });
      if (level === 'namespace') {
        const back = viewMode === 'namespaces' ? 'ns-root' : 'node';
        return set({ level: back, selectedNamespace: null });
      }
      if (level === 'node')    return set({ level: 'cluster', selectedNode: null });
      if (level === 'cluster') return set({ level: 'root', selectedNode: null });
      if (level === 'ns-root') return set({ level: 'root', selectedNamespace: null, selectedDeployment: null });
    },

    navigateToLevel: (level) => {
      if (level === 'cluster')    return set({ level: 'cluster',    selectedNode: null, selectedNamespace: null, selectedDeployment: null });
      if (level === 'ns-root')    return set({ level: 'ns-root',    selectedNamespace: null, selectedDeployment: null });
      if (level === 'node')       return set({ level: 'node',       selectedNamespace: null, selectedDeployment: null });
      if (level === 'namespace')  return set({ level: 'namespace',  selectedDeployment: null });
    },
  };
});
