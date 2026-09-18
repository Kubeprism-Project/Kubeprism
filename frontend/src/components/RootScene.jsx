import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { useStore } from '../store/useStore';
import CubeObject from './CubeObject';
import AlertBadge from './AlertBadge';
import { worstMemFill, worstStatusEdge } from '../utils/podColors';
import { activeAlertCount } from '../utils/alerts';

// cube size 1.5 → half = 0.75
const LABEL_Y = 0.75 + 0.65; // 1.4
const SUB_Y   = 0.75 + 0.38; // 1.13

const MODES = [
  { id: 'nodes',      label: 'CLUSTER',    subtitle: 'Cluster → Nodes → Pods',          defaultColor: '#7eb8d4', pos: [-3.5, 0, 0] },
  { id: 'namespaces', label: 'NAMESPACES', subtitle: 'Namespaces → Deployments → Pods',  defaultColor: '#9e7ed4', pos: [3.5,  0, 0] },
];

function ModeCube({ mode, fillColor, edgeColor, alerts, index }) {
  const cubeRef  = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const setViewMode = useStore(s => s.setViewMode);

  const color = fillColor || mode.defaultColor;

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
      position={mode.pos}
      onClick={(e) => { e.stopPropagation(); setViewMode(mode.id); }}
      onPointerOver={() => { setHovered(true);  document.body.style.cursor = 'pointer'; }}
      onPointerOut ={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      <animated.group ref={groupRef} scale={scale}>
        <CubeObject
          ref={cubeRef}
          width={1.5} height={1.5} depth={1.5}
          color={color}
          edgeColor={edgeColor || mode.defaultColor}
          opacity={0.48}
          emissiveIntensity={0.22}
          hovered={hovered}
        />
      </animated.group>

      <AlertBadge count={alerts} cubeHalf={0.75} />

      <Billboard position={[0, LABEL_Y, 0]}>
        <Text fontSize={0.22} color="#b8c8d8" anchorX="center" letterSpacing={0.05}>
          {mode.label}
        </Text>
      </Billboard>
      <Billboard position={[0, SUB_Y, 0]}>
        <Text fontSize={0.14} color={color} anchorX="center">
          {mode.subtitle}
        </Text>
      </Billboard>
    </group>
  );
}

export default function RootScene() {
  const clusterData  = useStore(s => s.clusterData);
  const activeAlerts = useStore(s => s.activeAlerts);
  const pods        = clusterData?.pods || [];
  const clusterName = clusterData?.clusterName || '';
  const fillColor   = worstMemFill(pods);
  const edgeColor   = worstStatusEdge(pods);
  const alerts      = activeAlertCount(pods, activeAlerts);

  return (
    <group>
      <Billboard position={[0, 3.5, 0]}>
        <Text fontSize={0.32} color="#b8c8d8" anchorX="center" letterSpacing={0.08}>
          {clusterName.toUpperCase()}
        </Text>
      </Billboard>

      {MODES.map((mode, i) => (
        <ModeCube key={mode.id} mode={mode} fillColor={fillColor} edgeColor={edgeColor} alerts={alerts} index={i} />
      ))}
    </group>
  );
}
