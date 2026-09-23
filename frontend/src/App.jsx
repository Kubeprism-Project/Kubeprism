import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, Preload, OrbitControls, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useStore } from './store/useStore';
import { useWebSocket } from './hooks/useWebSocket';
import RootScene from './components/RootScene';
import ClusterScene from './components/ClusterScene';
import NodeScene from './components/NodeScene';
import NamespaceScene from './components/NamespaceScene';
import DeploymentScene from './components/DeploymentScene';
import NamespacesRootScene from './components/NamespacesRootScene';
import HUD from './components/HUD';
import LogModal from './components/LogModal';
import Sidebar from './components/Sidebar';
import AlertToast from './components/AlertToast';
import SearchModal from './components/SearchModal';
import ConfigsModal from './components/ConfigsModal';

// Camera presets per level
const CAMERA = {
  root:       { position: [0,  5, 14], target: [0, 0, 0] },
  cluster:    { position: [0, 10, 22], target: [0, 0, 0] },
  node:       { position: [0,  9, 18], target: [0, 0, 0] },
  'ns-root':  { position: [0, 12, 24], target: [0, 0, 0] },
  namespace:  { position: [0, 14, 20], target: [0, 2, 0] },
  deployment: { position: [0, 10, 16], target: [0, 0, 0] },
};

export default function App() {
  useWebSocket();
  const level = useStore(s => s.level);
  const [opacity, setOpacity] = useState(1);
  const [activeLevel, setActiveLevel] = useState(level);

  useEffect(() => {
    setOpacity(0);
    const t = setTimeout(() => {
      setActiveLevel(level);
      setOpacity(1);
    }, 220);
    return () => clearTimeout(t);
  }, [level]);

  const cam = CAMERA[activeLevel] || CAMERA.cluster;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#00000f', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, opacity, transition: 'opacity 0.22s ease' }}>
        <Canvas
          camera={{ position: cam.position, fov: 52, near: 0.1, far: 250 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 1.5]}
          performance={{ min: 0.5 }}
        >
          <color attach="background" args={['#00000f']} />
          <fog attach="fog" args={['#00000f', 40, 100]} />

          <ambientLight intensity={0.7} />
          <pointLight position={[10, 20, 10]} intensity={1.4} color="#ffffff" />

          <Stars radius={180} depth={60} count={1200} factor={2} saturation={0} fade speed={0.2} />

          <OrbitControls
            enableZoom
            enableRotate
            enablePan={false}
            zoomSpeed={0.8}
            rotateSpeed={0.6}
            minDistance={4}
            maxDistance={60}
            autoRotate
            autoRotateSpeed={0.4}
            target={cam.target}
          />

          <Suspense fallback={null}>
            {activeLevel === 'root'       && <RootScene />}
            {activeLevel === 'cluster'    && <ClusterScene />}
            {activeLevel === 'node'       && <NodeScene />}
            {activeLevel === 'ns-root'    && <NamespacesRootScene />}
            {activeLevel === 'namespace'  && <NamespaceScene />}
            {activeLevel === 'deployment' && <DeploymentScene />}
          </Suspense>

          <EffectComposer multisampling={0}>
            <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.8} intensity={0.2} radius={0.4} mipmapBlur />
          </EffectComposer>

          <AdaptiveDpr pixelated />
          <AdaptiveEvents />
          <Preload all />
        </Canvas>
      </div>

      <Sidebar />
      <HUD />
      <LogModal />
      <AlertToast />
      <SearchModal />
      <ConfigsModal />
    </div>
  );
}
