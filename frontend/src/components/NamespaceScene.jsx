import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { useStore } from '../store/useStore';
import CubeObject from './CubeObject';
import { worstMemFill, worstStatusEdge, podsForDeployment } from '../utils/podColors';

const HEALTH_COLOR = { Healthy: '#7ed4a8', Degraded: '#d4c07e', Critical: '#d47e7e' };

function DepCube({ deployment, pods, index, total, onClick }) {
  const cubeRef  = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

  const depPods   = podsForDeployment(pods, deployment);
  const fillColor = worstMemFill(depPods) || HEALTH_COLOR[deployment.health] || '#3a5060';
  const edgeColor = worstStatusEdge(depPods);
  const cols   = Math.ceil(Math.sqrt(total));
  const spacing = 3.2;
  const col     = index % cols;
  const row     = Math.floor(index / cols);
  const offsetX = ((cols - 1) / 2) * spacing;
  const offsetZ = (Math.ceil(total / cols) - 1) / 2 * spacing;
  const pos     = [col * spacing - offsetX, 0, row * spacing - offsetZ];

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
      onClick={(e) => { e.stopPropagation(); onClick(deployment); }}
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

      <Billboard position={[0, 1.05, 0]}>
        <Text fontSize={0.2} color="#b8c8d8" anchorX="center" maxWidth={4}>
          {deployment.name}
        </Text>
      </Billboard>
      <Billboard position={[0, 0.78, 0]}>
        <Text fontSize={0.14} color={color} anchorX="center">
          {deployment.readyReplicas}/{deployment.replicas} · {deployment.health}
        </Text>
      </Billboard>
    </group>
  );
}

export default function NamespaceScene() {
  const selectedNamespace = useStore(s => s.selectedNamespace);
  const clusterData       = useStore(s => s.clusterData);
  const navigateTo        = useStore(s => s.navigateTo);

  const nsPods = (clusterData?.pods || []).filter(
    p => p.namespace === selectedNamespace?.name
  );
  const deployments = (clusterData?.deployments || []).filter(
    d => d.namespace === selectedNamespace?.name
  );

  if (!selectedNamespace) return null;

  return (
    <group>
      <Billboard position={[0, 3.5, 0]}>
        <Text fontSize={0.38} color="#b8c8d8" anchorX="center" letterSpacing={0.04}>
          {selectedNamespace.name}
        </Text>
      </Billboard>
      <Billboard position={[0, 3.04, 0]}>
        <Text fontSize={0.18} color="#3a4a58" anchorX="center">
          {deployments.length} deployments
        </Text>
      </Billboard>

      {deployments.map((dep, i) => (
        <DepCube
          key={dep.name}
          deployment={dep}
          pods={nsPods}
          index={i}
          total={deployments.length}
          onClick={(d) => navigateTo('deployment', { selectedDeployment: d })}
        />
      ))}
    </group>
  );
}
