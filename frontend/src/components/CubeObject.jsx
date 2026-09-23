import { forwardRef } from 'react';
import * as THREE from 'three';

// Module-level geometry cache — created once, shared across all cube instances
const _geomCache = new Map();
function getCachedBox(w, h, d) {
  const key = `${w},${h},${d}`;
  if (!_geomCache.has(key)) {
    const geom  = new THREE.BoxGeometry(w, h, d);
    const edges = new THREE.EdgesGeometry(geom);
    _geomCache.set(key, { geom, edges });
  }
  return _geomCache.get(key);
}

/**
 * Cube with visible edges.
 * - Semi-transparent fill so faces are readable
 * - EdgesGeometry overlay for clean 12-edge outline
 * - Geometries are shared at module level (no per-instance allocation)
 */
const CubeObject = forwardRef(function CubeObject(
  { width = 1, height = 1, depth = 1, color = '#7eb8d4', edgeColor, opacity = 0.55, emissiveIntensity = 0.22, hovered = false },
  ref
) {
  const eColor = edgeColor || color;
  const { geom: boxGeom, edges: edgeGeom } = getCachedBox(width, height, depth);

  return (
    <group ref={ref}>
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
      <lineSegments geometry={edgeGeom}>
        <lineBasicMaterial color={eColor} transparent opacity={hovered ? 1 : 0.85} />
      </lineSegments>
    </group>
  );
});

export default CubeObject;
