import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { useStore } from '../store/useStore';
import CubeObject from './CubeObject';
import AlertBadge from './AlertBadge';
import { worstMemFill, worstStatusEdge } from '../utils/podColors';


function NSCube({ ns, pods, deployments, index, total, onClick }) {
  const cubeRef  = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

  const cols          = Math.ceil(Math.sqrt(total));
  const spacing       = 5;
  const col           = index % cols;
  const row           = Math.floor(index / cols);
  const offsetX       = ((cols - 1) / 2) * spacing;
  const offsetZ       = (Math.ceil(total / cols) - 1) / 2 * spacing;
  const pos           = [col * spacing - offsetX, 0, row * spacing - offsetZ];

  const nsPods        = pods.filter(p => p.namespace === ns.name);
  const nsDeployments = deployments.filter(d => d.namespace === ns.name);
  const runningPods   = nsPods.filter(p => p.status === 'Running').length;
  const allHealthy  = nsDeployments.every(d => d.health === 'Healthy');
  const hasIssue    = nsDeployments.some(d => d.health === 'Critical');
  const fillColor = worstMemFill(nsPods) || (hasIssue ? '#d47e7e' : !allHealthy ? '#d4c07e' : '#7ed4a8');
  const edgeColor = worstStatusEdge(nsPods);
  const podKeys   = nsPods.map(p => `${p.namespace}/${p.name}`);
  const alerts    = useStore(s => podKeys.filter(k => !!s.activeAlerts[k]).length);

  const { scale } = useSpring({
    scale: hovered ? 1.18 : 1,
    config: { tension: 280, friction: 20 },
  });

  useFrame(({ clock }) => {
    if (cubeRef.current) {
      cubeRef.current.rotation.y += 0.004;
      cubeRef.current.rotation.x += 0.002;
    }
    if (groupRef.current)
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.35 + index * 0.7) * 0.2;
  });

  return (
    <group
      position={pos}
      onClick={(e) => { e.stopPropagation(); onClick(ns); }}
      onPointerOver={() => { setHovered(true);  document.body.style.cursor = 'pointer'; }}
      onPointerOut ={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      <animated.group ref={groupRef} scale={scale}>
        <CubeObject
          ref={cubeRef}
          width={0.9} height={0.9} depth={0.9}
          color={fillColor}
          edgeColor={edgeColor}
          opacity={0.48}
          emissiveIntensity={0.22}
          hovered={hovered}
        />
      </animated.group>

      <AlertBadge count={alerts} cubeHalf={0.45} />

      <Billboard position={[0, 1.05, 0]}>
        <Text fontSize={0.2} color="#b8c8d8" anchorX="center">
          {ns.name}
        </Text>
      </Billboard>
      <Billboard position={[0, 0.78, 0]}>
        <Text fontSize={0.14} color={fillColor} anchorX="center">
          {nsDeployments.length}d · {runningPods}/{nsPods.length}p
        </Text>
      </Billboard>
    </group>
  );
}

export default function NamespacesRootScene() {
  const clusterData = useStore(s => s.clusterData);
  const navigateTo  = useStore(s => s.navigateTo);

  const namespaces  = clusterData?.namespaces  || [];
  const pods        = clusterData?.pods        || [];
  const deployments = clusterData?.deployments || [];

  // Only show namespaces that have deployments
  const activeNS = useMemo(() =>
    namespaces.filter(ns => deployments.some(d => d.namespace === ns.name)),
    [namespaces, deployments]
  );

  return (
    <group>
      {activeNS.map((ns, i) => (
        <NSCube
          key={ns.name}
          ns={ns}
          index={i}
          total={activeNS.length}
          pods={pods}
          deployments={deployments}
          onClick={(ns) => navigateTo('namespace', { selectedNamespace: ns })}
        />
      ))}
    </group>
  );
}
