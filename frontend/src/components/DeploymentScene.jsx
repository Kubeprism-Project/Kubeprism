import { useMemo } from 'react';
import { Text, Billboard } from '@react-three/drei';
import { useStore } from '../store/useStore';
import PodCube, { buildPodGrid } from './PodCube';
import { podsForWorkload } from '../utils/podColors';

const KIND_COLOR_MAP = { StatefulSet: '#a855f7', DaemonSet: '#22d3ee' };

function subTitle(workload, pods) {
  if (!workload) return '';
  const k = workload.kind;
  if (k === 'StatefulSet') return `${workload.readyReplicas}/${workload.replicas} ready · ${workload.namespace}`;
  if (k === 'DaemonSet')   return `${workload.ready}/${workload.desired} nodes · ${workload.namespace}`;
  return `${workload.readyReplicas}/${workload.replicas} ready · ${workload.namespace}`;
}

export default function DeploymentScene() {
  const selectedDeployment = useStore(s => s.selectedDeployment);
  const clusterData        = useStore(s => s.clusterData);

  const allPods = clusterData?.pods || [];
  const pods    = useMemo(
    () => podsForWorkload(allPods, selectedDeployment),
    [allPods, selectedDeployment]
  );

  const positions = useMemo(() => buildPodGrid(pods.length), [pods.length]);

  const worstPct = pods.length ? Math.max(...pods.map(p => p.memPct ?? -1)) : -1;
  const kindColor = selectedDeployment ? KIND_COLOR_MAP[selectedDeployment.kind] : null;
  const color = kindColor || (
    !selectedDeployment ? '#9aaabb'
    : worstPct >= 80 ? '#d47e7e'
    : worstPct >= 50 ? '#d4c07e'
    : selectedDeployment.readyReplicas === selectedDeployment.replicas ? '#7ed4a8'
    : selectedDeployment.readyReplicas > 0 ? '#d4c07e' : '#d47e7e'
  );

  if (!selectedDeployment) return null;

  return (
    <group>
      <Billboard position={[0, 3.5, 0]}>
        <Text fontSize={0.38} color="#b8c8d8" anchorX="center">
          {selectedDeployment.name}
        </Text>
      </Billboard>
      <Billboard position={[0, 3.04, 0]}>
        <Text fontSize={0.18} color={color} anchorX="center">
          {subTitle(selectedDeployment, pods)}
        </Text>
      </Billboard>

      {pods.map((pod, i) => (
        <PodCube
          key={pod.name}
          pod={pod}
          position={positions[i] || [0, 0, 0]}
          index={i}
        />
      ))}

      {pods.length === 0 && (
        <Billboard>
          <Text fontSize={0.28} color="#3a4858" anchorX="center">No pods found</Text>
        </Billboard>
      )}
    </group>
  );
}
