export function isAlertPod(pod) {
  return pod.status === 'Failed' || pod.crashLoop === true || pod.restarts >= 5;
}

export function alertCount(pods) {
  return pods.filter(isAlertPod).length;
}
