import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import AlertBadge from './AlertBadge';
import { worstMemFill, worstStatusEdge, podsForWorkload } from '../utils/podColors';
import { activeAlertCount } from '../utils/alerts';

// Colors per workload kind
const KIND_COLOR = {
  Deployment:  null,       // uses health/mem color (existing logic)
  StatefulSet: '#a855f7',  // purple
  DaemonSet:   '#22d3ee',  // cyan
  CronJob:     '#f59e0b',  // amber
};

const KIND_LABEL = {
  Deployment:  'DEP',
  StatefulSet: 'STS',
  DaemonSet:   'DS',
  CronJob:     'CJ',
};

const HEALTH_COLOR = { Healthy: '#7ed4a8', Degraded: '#d4c07e', Critical: '#d47e7e' };
const CRON_STATUS_COLOR = (cj) => {
  if (cj.suspended) return '#556677';
  if (!cj.lastSuccessTime) return '#d47e7e';
  return '#7ed4a8';
};

// Geometry mesh + edges per kind
function WorkloadMesh({ kind, color, edgeColor, hovered }) {
  const geom = useMemo(() => {
    if (kind === 'StatefulSet') return new THREE.OctahedronGeometry(0.6);
    if (kind === 'DaemonSet')   return new THREE.CylinderGeometry(0.7, 0.7, 0.3, 8);
    if (kind === 'CronJob')     return new THREE.IcosahedronGeometry(0.5, 0);
    return new THREE.BoxGeometry(0.9, 0.9, 0.9);
  }, [kind]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geom), [geom]);

  return (
    <group>
      <mesh geometry={geom}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.44 : 0.22}
          roughness={0.2}
          metalness={0.5}
          transparent
          opacity={hovered ? 0.65 : 0.48}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={edgeColor} transparent opacity={hovered ? 1 : 0.85} />
      </lineSegments>
    </group>
  );
}

function cronSubLabel(cj) {
  if (cj.suspended) return 'suspended';
  if (cj.active)    return 'running';
  if (!cj.lastSuccessTime) return 'last run failed';
  return cj.schedule;
}

function workloadSubLabel(workload) {
  const k = workload.kind;
  if (k === 'CronJob')     return cronSubLabel(workload);
  if (k === 'DaemonSet')   return `${workload.ready}/${workload.desired} nodes`;
  if (k === 'StatefulSet') return `${workload.readyReplicas}/${workload.replicas} · ${workload.health}`;
  return `${workload.readyReplicas}/${workload.replicas} · ${workload.health}`;
}

export default function WorkloadCube({ workload, pods, index, total, onClick }) {
  const meshRef  = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

  const activeAlerts = useStore(s => s.activeAlerts);

  const wPods     = podsForWorkload(pods, workload);
  const kindColor = KIND_COLOR[workload.kind];

  let fillColor, edgeColor;
  if (workload.kind === 'CronJob') {
    fillColor = edgeColor = CRON_STATUS_COLOR(workload);
  } else if (kindColor) {
    fillColor = edgeColor = kindColor;
    // override if degraded/critical
    if (workload.health === 'Critical') { fillColor = edgeColor = '#d47e7e'; }
    else if (workload.health === 'Degraded') { fillColor = edgeColor = '#d4c07e'; }
  } else {
    // Deployment: use existing mem/health color
    fillColor = worstMemFill(wPods) || HEALTH_COLOR[workload.health] || '#3a5060';
    edgeColor = worstStatusEdge(wPods) || fillColor;
  }

  const alerts = workload.kind === 'CronJob' ? 0 : activeAlertCount(wPods, activeAlerts);

  // Grid in XY plane (not XZ) so sections along Z never overlap each other
  const cols    = Math.min(total, Math.ceil(Math.sqrt(total)));
  const spacing = 3.2;
  const rowSpacing = 3.0;
  const col     = index % cols;
  const row     = Math.floor(index / cols);
  const offsetX = ((cols - 1) / 2) * spacing;
  const offsetY = (Math.ceil(total / cols) - 1) / 2 * rowSpacing;
  const pos     = [col * spacing - offsetX, offsetY - row * rowSpacing, 0];

  const { scale } = useSpring({ scale: hovered ? 1.18 : 1, config: { tension: 280, friction: 20 } });

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.004;
      if (workload.kind !== 'DaemonSet') meshRef.current.rotation.x += 0.002;
    }
    if (groupRef.current)
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.35 + index * 0.7) * 0.2;
  });

  const cubeHalf = workload.kind === 'DaemonSet' ? 0.15 : 0.5;

  return (
    <group
      position={pos}
      onClick={(e) => { e.stopPropagation(); onClick(workload); }}
      onPointerOver={() => { setHovered(true);  document.body.style.cursor = 'pointer'; }}
      onPointerOut ={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      <animated.group ref={groupRef} scale={scale}>
        <group ref={meshRef}>
          <WorkloadMesh kind={workload.kind} color={fillColor} edgeColor={edgeColor} hovered={hovered} />
        </group>
      </animated.group>

      <AlertBadge count={alerts} cubeHalf={cubeHalf} />

      {/* Kind badge */}
      <Billboard position={[0, 1.05, 0]}>
        <Text fontSize={0.2} color="#b8c8d8" anchorX="center" maxWidth={4}>
          {workload.name}
        </Text>
      </Billboard>
      <Billboard position={[0, 0.78, 0]}>
        <Text fontSize={0.14} color={fillColor} anchorX="center">
          {workloadSubLabel(workload)}
        </Text>
      </Billboard>
      <Billboard position={[0, 0.56, 0]}>
        <Text fontSize={0.11} color={KIND_COLOR[workload.kind] || '#3a5a70'} anchorX="center">
          {KIND_LABEL[workload.kind]}
        </Text>
      </Billboard>
    </group>
  );
}
