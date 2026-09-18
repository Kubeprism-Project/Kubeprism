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

  const x = cubeHalf + 0.08;
  const y = cubeHalf + 0.08;

  return (
    <group position={[x, y, 0]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.11, 8, 8]} />
        <meshStandardMaterial color="#ff3355" emissive="#ff3355" emissiveIntensity={2} />
      </mesh>
      {count > 1 && (
        <Billboard position={[0.2, 0, 0]}>
          <Text fontSize={0.13} color="#ff3355" anchorX="left">
            {count}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
