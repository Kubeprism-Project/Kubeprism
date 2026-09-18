import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { useStore } from '../store/useStore';
import CubeObject from './CubeObject';
import AlertBadge from './AlertBadge';
import { isAlertPod } from '../utils/alerts';

export const POD_COLOR = {
  Running:   '#7ed4a8',
  Pending:   '#d4c07e',
  Failed:    '#d47e7e',
  Succeeded: '#7eaad4',
  Unknown:   '#2e3848',
};

export const POD_SIZE    = 0.65;
export const POD_SPACING = 1.8;

export function buildPodGrid(count) {
  const cols = Math.ceil(Math.sqrt(count));
  return Array.from({ length: count }, (_, i) => [
    (i % cols - (cols - 1) / 2) * POD_SPACING,
    0,
    (Math.floor(i / cols) - (Math.ceil(count / cols) - 1) / 2) * POD_SPACING,
  ]);
}

// label Y = cube_half + 0.6 = 0.325 + 0.6 = 0.925
// sub  Y = cube_half + 0.33 = 0.325 + 0.33 = 0.655
const LABEL_Y = 0.925;
const SUB_Y   = 0.655;

export default function PodCube({ pod, position, index, showNamespace = false }) {
  const cubeRef  = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

  const fillColor   = pod.memPct != null
    ? pod.memPct >= 80 ? '#d47e7e' : pod.memPct >= 50 ? '#d4c07e' : '#7ed4a8'
    : POD_COLOR[pod.status] || POD_COLOR.Unknown;
  const edgeColor   = POD_COLOR[pod.status] || POD_COLOR.Unknown;
  const openPodLogs = useStore(s => s.openPodLogs);

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

  const shortName = pod.name.length > 22 ? '…' + pod.name.slice(-20) : pod.name;
  const subtitle  = [
    showNamespace && pod.namespace,
    pod.status,
    pod.restarts > 0 && `${pod.restarts}r`,
    pod.cpu && pod.memory && `${pod.cpu}${pod.cpuLimit ? '/'+pod.cpuLimit : ''} · ${pod.memory}${pod.memLimit ? '/'+pod.memLimit : ''}`,
  ].filter(Boolean).join(' · ');

  return (
    <group
      position={position}
      onClick={(e) => { e.stopPropagation(); openPodLogs(pod); }}
      onPointerOver={() => { setHovered(true);  document.body.style.cursor = 'pointer'; }}
      onPointerOut ={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      <animated.group ref={groupRef} scale={scale}>
        <CubeObject
          ref={cubeRef}
          width={POD_SIZE} height={POD_SIZE} depth={POD_SIZE}
          color={fillColor}
          edgeColor={edgeColor}
          opacity={0.48}
          emissiveIntensity={0.22}
          hovered={hovered}
        />
      </animated.group>

      <AlertBadge count={isAlertPod(pod) ? 1 : 0} cubeHalf={POD_SIZE / 2} />

      <Billboard position={[0, LABEL_Y, 0]}>
        <Text fontSize={0.2} color="#b8c8d8" anchorX="center" maxWidth={3.5}>
          {shortName}
        </Text>
      </Billboard>
      <Billboard position={[0, SUB_Y, 0]}>
        <Text fontSize={0.14} color={fillColor} anchorX="center">
          {subtitle}
        </Text>
      </Billboard>
    </group>
  );
}
