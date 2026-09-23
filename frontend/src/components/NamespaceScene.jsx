import { useStore } from '../store/useStore';
import { Text, Billboard } from '@react-three/drei';
import WorkloadCube from './WorkloadCube';

const KIND_ORDER = ['Deployment', 'StatefulSet', 'DaemonSet', 'CronJob'];
const SECTION_COLOR = {
  Deployment:  '#3a6a80',
  StatefulSet: '#7a3a9a',
  DaemonSet:   '#1a8a9a',
  CronJob:     '#9a7a1a',
};

function SectionLabel({ label, color, position }) {
  return (
    <Billboard position={position}>
      <Text fontSize={0.16} color={color} anchorX="center" letterSpacing={0.08}>
        {label.toUpperCase()}
      </Text>
    </Billboard>
  );
}

export default function NamespaceScene() {
  const selectedNamespace = useStore(s => s.selectedNamespace);
  const clusterData       = useStore(s => s.clusterData);
  const navigateTo        = useStore(s => s.navigateTo);

  if (!selectedNamespace) return null;

  const ns      = selectedNamespace.name;
  const pods    = (clusterData?.pods        || []).filter(p => p.namespace === ns);
  const deps    = (clusterData?.deployments  || []).filter(d => d.namespace === ns).map(d => ({ ...d, kind: 'Deployment'  }));
  const stss    = (clusterData?.statefulSets || []).filter(s => s.namespace === ns).map(s => ({ ...s, kind: 'StatefulSet' }));
  const dss     = (clusterData?.daemonSets   || []).filter(d => d.namespace === ns).map(d => ({ ...d, kind: 'DaemonSet'   }));
  const cjs     = (clusterData?.cronJobs     || []).filter(c => c.namespace === ns).map(c => ({ ...c, kind: 'CronJob'     }));

  // Group by kind, ordered
  const sections = [
    { kind: 'Deployment',  items: deps  },
    { kind: 'StatefulSet', items: stss  },
    { kind: 'DaemonSet',   items: dss   },
    { kind: 'CronJob',     items: cjs   },
  ].filter(s => s.items.length > 0);

  const totalWorkloads = sections.reduce((acc, s) => acc + s.items.length, 0);

  // Layout sections along the Z axis with spacing
  const SECTION_SPACING = 5.5;
  const totalSections = sections.length;
  const totalDepth = (totalSections - 1) * SECTION_SPACING;

  function handleClick(workload) {
    if (workload.kind === 'CronJob') return; // CronJob: no navigation (future)
    navigateTo('deployment', { selectedDeployment: workload });
  }

  return (
    <group>
      {/* Namespace title */}
      <Billboard position={[0, 3.5, 0]}>
        <Text fontSize={0.38} color="#b8c8d8" anchorX="center" letterSpacing={0.04}>
          {selectedNamespace.name}
        </Text>
      </Billboard>
      <Billboard position={[0, 3.04, 0]}>
        <Text fontSize={0.18} color="#3a4a58" anchorX="center">
          {totalWorkloads} workloads
          {stss.length > 0 ? ` · ${stss.length} sts` : ''}
          {dss.length > 0  ? ` · ${dss.length} ds`   : ''}
          {cjs.length > 0  ? ` · ${cjs.length} cj`   : ''}
        </Text>
      </Billboard>

      {/* One group per workload kind */}
      {sections.map((section, si) => {
        const zOffset = -((si - (totalSections - 1) / 2) * SECTION_SPACING);
        return (
          <group key={section.kind} position={[0, 0, zOffset]}>
            {totalSections > 1 && (
              <SectionLabel
                label={section.kind + 's'}
                color={SECTION_COLOR[section.kind]}
                position={[0, 2.0, 0]}
              />
            )}
            {section.items.map((w, i) => (
              <WorkloadCube
                key={`${section.kind}-${w.name}`}
                workload={w}
                pods={pods}
                index={i}
                total={section.items.length}
                onClick={handleClick}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}
