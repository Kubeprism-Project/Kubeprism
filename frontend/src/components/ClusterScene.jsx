import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { useStore } from '../store/useStore';
import CubeObject from './CubeObject';
import AlertBadge from './AlertBadge';
import { worstMemFill, worstStatusEdge } from '../utils/podColors';

const LABEL_Y = 1.2;
const SUB_Y   = 0.93;

function NodeCube({ node, index, total, pods, onClick }) {
  const cubeRef  = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

  const nodePods    = pods.filter(p => p.nodeName === node.name);
  const runningPods = nodePods.filter(p => p.status === 'Running').length;
  const totalPods   = nodePods.length;
  const fillColor   = worstMemFill(nodePods) || (node.status === 'Ready' ? '#7eb8d4' : '#d47e7e');
  const edgeColor   = worstStatusEdge(nodePods);
  const podKeys     = nodePods.map(p => `${p.namespace}/${p.name}`);
  const alerts      = useStore(s => podKeys.filter(k => !!s.activeAlerts[k]).length);

  const cols    = Math.ceil(Math.sqrt(total));
  const spacing = 5;
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
      onClick={(e) => { e.stopPropagation(); onClick(node); }}
      onPointerOver={() => { setHovered(true);  document.body.style.cursor = 'pointer'; }}
      onPointerOut ={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      <animated.group ref={groupRef} scale={scale}>
        <CubeObject
          ref={cubeRef}
          width={1.2} height={1.2} depth={1.2}
          color={fillColor}
          edgeColor={edgeColor}
          opacity={0.48}
          emissiveIntensity={0.22}
          hovered={hovered}
        />
      </animated.group>

      <AlertBadge count={alerts} cubeHalf={0.6} />

      <Billboard position={[0, LABEL_Y, 0]}>
        <Text fontSize={0.2} color="#b8c8d8" anchorX="center">
          {node.name.replace(/^scw-/, '').replace(/-[a-z0-9]{6}$/, '')}
        </Text>
      </Billboard>
      <Billboard position={[0, SUB_Y, 0]}>
        <Text fontSize={0.14} color={fillColor} anchorX="center">
          {node.status} · {runningPods}/{totalPods} pods
        </Text>
      </Billboard>
    </group>
  );
}

export default function ClusterScene() {
  const clusterData = useStore(s => s.clusterData);
  const navigateTo  = useStore(s => s.navigateTo);

  const nodes = clusterData?.nodes || [];
  const pods  = clusterData?.pods  || [];

  return (
    <group>
      {nodes.map((node, i) => (
        <NodeCube
          key={node.name}
          node={node}
          index={i}
          total={nodes.length}
          pods={pods}
          onClick={(n) => navigateTo('node', { selectedNode: n })}
        />
      ))}
    </group>
  );
}
