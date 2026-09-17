import { useMemo } from 'react';
import { Text, Billboard } from '@react-three/drei';
import { useStore } from '../store/useStore';
import PodCube, { buildPodGrid } from './PodCube';

export default function NodeScene() {
  const { selectedNode, clusterData } = useStore(s => ({
    selectedNode: s.selectedNode,
    clusterData:  s.clusterData,
  }));

  const pods = clusterData?.pods || [];

  const nodePods = useMemo(
    () => pods.filter(p => p.nodeName === selectedNode?.name),
    [pods, selectedNode]
  );

  const positions = useMemo(() => buildPodGrid(nodePods.length), [nodePods.length]);

  const runningCount = nodePods.filter(p => p.status === 'Running').length;
  const color = selectedNode?.status === 'Ready' ? '#7eb8d4' : '#d47e7e';

  if (!selectedNode) return null;

  return (
    <group>
      <Billboard position={[0, 3.5, 0]}>
        <Text fontSize={0.38} color="#b8c8d8" anchorX="center">
          {selectedNode.name.replace(/^scw-/, '').replace(/-[a-z0-9]{6}$/, '')}
        </Text>
      </Billboard>
      <Billboard position={[0, 3.04, 0]}>
        <Text fontSize={0.18} color={color} anchorX="center">
          {runningCount}/{nodePods.length} running · {selectedNode.status}
        </Text>
      </Billboard>

      {nodePods.map((pod, i) => (
        <PodCube
          key={pod.name}
          pod={pod}
          position={positions[i] || [0, 0, 0]}
          index={i}
          showNamespace
        />
      ))}

      {nodePods.length === 0 && (
        <Billboard>
          <Text fontSize={0.28} color="#3a4858" anchorX="center">No pods found</Text>
        </Billboard>
      )}
    </group>
  );
}
