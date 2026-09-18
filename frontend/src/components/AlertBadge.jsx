import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';

export default function AlertBadge({ count, cubeHalf }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 5) * 0.3;
      meshRef.current.scale.setScalar(s);
    }
  });

  if (!count) return null;

  // Position well outside the cube's bounding sphere to avoid occlusion
  const x = cubeHalf + 0.22;
  const y = cubeHalf + 0.22;

  return (
    <group position={[x, y, 0]}>
      <mesh ref={meshRef} renderOrder={10}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshStandardMaterial
          color="#ff3355" emissive="#ff3355" emissiveIntensity={2.5}
          depthTest={false}
        />
      </mesh>
      {count > 1 && (
        <Billboard position={[0.22, 0, 0]}>
          <Text fontSize={0.14} color="#ff3355" anchorX="left" renderOrder={11}>
            {count}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
