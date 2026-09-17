// Worst memory fill color based on memPct across a list of pods
export function worstMemFill(pods) {
  const pcts = pods.map(p => p.memPct).filter(p => p != null);
  if (!pcts.length) return null;
  const w = Math.max(...pcts);
  if (w >= 80) return '#d47e7e';
  if (w >= 50) return '#d4c07e';
  return '#7ed4a8';
}

// Worst status edge color based on pod.status across a list of pods
export function worstStatusEdge(pods) {
  if (pods.some(p => p.status === 'Failed'))  return '#d47e7e';
  if (pods.some(p => p.status === 'Pending')) return '#d4c07e';
  return '#7ed4a8';
}

// Match pods to a deployment using its selector labels
export function podsForDeployment(pods, deployment) {
  if (!deployment) return [];
  return pods.filter(p =>
    p.namespace === deployment.namespace &&
    Object.entries(deployment.selector || {}).every(([k, v]) => p.labels?.[k] === v)
  );
}
