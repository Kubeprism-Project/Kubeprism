import { useMemo, forwardRef } from 'react';
import * as THREE from 'three';

/**
 * Cube with visible edges.
 * - Semi-transparent fill so faces are readable
 * - EdgesGeometry overlay for clean 12-edge outline
 */
const CubeObject = forwardRef(function CubeObject(
  { width = 1, height = 1, depth = 1, color = '#7eb8d4', edgeColor, opacity = 0.55, emissiveIntensity = 0.22, hovered = false },
  ref
) {
  const eColor = edgeColor || color;
  const boxGeom  = useMemo(() => new THREE.BoxGeometry(width, height, depth), [width, height, depth]);
  const edgeGeom = useMemo(() => new THREE.EdgesGeometry(boxGeom), [boxGeom]);

  return (
    <group ref={ref}>
      {/* Solid fill — semi-transparent so you see depth */}
      <mesh geometry={boxGeom}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? emissiveIntensity * 2 : emissiveIntensity}
          roughness={0.2}
          metalness={0.5}
          transparent
          opacity={hovered ? 0.65 : opacity}
        />
      </mesh>

      {/* Edge outline — bright, always visible */}
      <lineSegments geometry={edgeGeom}>
        <lineBasicMaterial color={eColor} transparent opacity={hovered ? 1 : 0.85} />
      </lineSegments>
    </group>
  );
});

export default CubeObject;
