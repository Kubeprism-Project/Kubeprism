export function isAlertPod(pod) {
  return pod.status === 'Failed' || pod.crashLoop === true || pod.restarts >= 5;
}

export function activeAlertCount(pods, activeAlerts) {
  return pods.filter(p => !!activeAlerts[`${p.namespace}/${p.name}`]).length;
}
