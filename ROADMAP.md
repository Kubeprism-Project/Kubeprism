# Kubeprism — Roadmap

Basée sur l'analyse des outils existants (k3s-observatory, kube-universe, KubeView, Dashboard officiel)
et des besoins remontés par la communauté Kubernetes.

---

## v0.1 — Observabilité de base

**Objectif** : rendre Kubeprism utile dès le premier incident en prod.

- [x] **Events K8s** — afficher les events d'un pod (CrashLoopBackOff, OOMKilled, ImagePullBackOff) dans un panel dédié, accessible depuis le cube *(livré en v0.0.2)*
- [x] **Recherche / filtre global** — barre de recherche par nom de pod, namespace, deployment (dès 50+ pods, la navigation hiérarchique ne suffit plus) *(livré en v0.0.2)*
- [x] **Notifications d'alerte** — badge rouge animé + toast quand un pod passe en Failed/CrashLoop, sans avoir à naviguer jusqu'à lui *(livré en v0.0.2)*

---

## v0.0.3 — Couverture complète des workloads *(livré 23/09/2026)*

**Objectif** : ne plus avoir de ressources invisibles.

- [x] **StatefulSets** — octahedron violet dans NamespaceScene, navigation vers pods
- [x] **DaemonSets** — cylindre cyan, pods filtrés par ownerKind/ownerName
- [x] **CronJobs / Jobs** — icosahedron amber, schedule + last run status
- [x] **ConfigMaps & Secrets** — panel CM/SC dans HUD, onglets CM/SC, clés listées, valeurs jamais exposées
- [x] **Performance** — GPU -40% Retina, géométries partagées, re-renders ciblés

---

## v0.3 — De spectateur a acteur

**Objectif** : agir directement depuis la scene 3D sans ouvrir un terminal.

- [ ] **Scale deployment** — slider ou +/- directement sur le cube, appel API kubectl scale
- [ ] **Restart pod** — bouton dans le panel pod (equivalent kubectl rollout restart)
- [ ] **Delete pod** — avec confirmation, pour forcer un redemarrage propre
- [ ] **Exec terminal** — terminal WebSocket dans le navigateur (kubectl exec -it) accessible depuis le cube pod

---

## v0.4 — Reseau & flux (killer feature visuelle)

**Objectif** : voir les communications entre services en 3D — aucun concurrent ne le fait bien.

- [ ] **Services & Ingress** — cubes/formes distinctes pour les Services (ClusterIP, NodePort, LoadBalancer) et Ingress avec leurs regles
- [ ] **Aretes reseau animees** — lignes lumineuses entre pods/services qui communiquent (base sur les labels selector)
- [ ] **Flux de trafic** — epaisseur ou vitesse de l'arete proportionnelle au volume (si Prometheus dispo)
- [ ] **Vue Service Map** — nouvelle scene dediee aux dependances reseau entre namespaces

---

## v0.5 — Helm & GitOps

**Objectif** : s'integrer dans les workflows de deploiement modernes.

- [ ] **Helm releases** — grouper les cubes par release Helm, couleur et label dedies
- [ ] **Etat des releases** — deployed / failed / superseded visible dans la scene
- [ ] **ArgoCD / Flux** — indicateur de sync state sur les cubes (synced / out-of-sync / progressing)

---

## v1.0 — Reference du marche

**Objectif** : l'outil 3D K8s incontournable.

- [ ] **Multi-cluster simultane** — voir 2-3 clusters cote-a-cote dans la meme scene 3D
- [ ] **Prometheus / custom metrics** — latence, error rate, RPS en plus de CPU/RAM
- [ ] **Replay historique** — scroll dans le temps pour voir l'etat du cluster a T-30min/T-1h
- [ ] **Mode presentation** — tour automatique anime de la scene (demos, conf, ecran mural)
- [ ] **Annotations 3D** — notes flottantes attachees a un pod/namespace dans la scene

---

## Analyse concurrentielle

| Outil | Point fort | Ce que Kubeprism fait mieux |
|-------|-----------|----------------------------|
| **k3s-observatory** | Pod affinity, animations scaling | Multi-cluster, log streaming, navigation hierarchique |
| **kube-universe** | Graphe force-directed, toutes ressources | Esthetique (bloom/etoiles), UX de navigation |
| **KubeView** | Flow Ingress->Service->Deployment->Pod | 3D immersif, temps reel WebSocket |
| **Dashboard officiel** | RBAC, deploy YAML, gestion complete | Visualisation, log streaming integre |

**Gap de marche identifie** : tous les outils 3D existants sont spectateurs.
Kubeprism sera le premier a permettre d'agir directement depuis la visualisation 3D.

---

## Versions publiees

| Version | Date | Highlights |
|---------|------|-----------|
| [0.0.2](CHANGELOG.md) | 2026-09-18 | Alert badges 3D + toasts, propagation hiérarchique, auto-recovery, scénario demo 3 min |
| [0.0.1](CHANGELOG.md) | 2026-09-17 | Version initiale — visu 3D, multi-cluster, log streaming, demo mode |
