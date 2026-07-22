# Career Copilot Helm Chart

Kubernetes Helm chart for deploying Career Copilot (server + client) on k3s or any Kubernetes cluster.

## Quick Start

### Deploy with defaults
```bash
helm upgrade --install career-copilot ./k8s/helm/career-copilot \
  --set server.image=ghcr.io/{owner}/{repo}-server:latest \
  --set client.image=ghcr.io/{owner}/{repo}-client:latest
```

### Deploy with persistence and ingress
```bash
helm upgrade --install career-copilot ./k8s/helm/career-copilot \
  --set server.image=ghcr.io/{owner}/{repo}-server:latest \
  --set client.image=ghcr.io/{owner}/{repo}-client:latest \
  --set persistence.enabled=true \
  --set ingress.enabled=true \
  --set ingress.host=mydomain.com
```

## Chart Structure

```
career-copilot/
├── Chart.yaml                          # Chart metadata
├── values.yaml                         # Default values
├── templates/
│   ├── _helpers.tpl                   # Template helpers (macros)
│   ├── deployment-server.yaml         # Server deployment + probes
│   ├── service-server.yaml            # Server service (ClusterIP)
│   ├── deployment-client.yaml         # Client deployment
│   ├── service-client.yaml            # Client service (ClusterIP)
│   ├── ingress.yaml                   # Optional ingress (Traefik)
│   ├── pvc.yaml                       # Optional persistent volume claim
│   └── cert-issuer.yaml               # Optional cert-manager issuer
└── README.md                           # This file
```

## Configuration (values.yaml)

### Replicas
```yaml
replicaCount: 1  # Number of pod replicas for both server and client
```

### Server Configuration
```yaml
server:
  image: "ghcr.io/owner/repo-server:latest"  # Docker image
  port: 3001                                   # Container port
  resources: {}                                # Optional: requests/limits
    # Example:
    # limits:
    #   cpu: "500m"
    #   memory: "512Mi"
    # requests:
    #   cpu: "100m"
    #   memory: "128Mi"
```

### Client Configuration
```yaml
client:
  image: "ghcr.io/owner/repo-client:latest"  # Docker image
  port: 3000                                   # Container port
  resources: {}                                # Optional: requests/limits
```

### Persistence (Optional)
```yaml
persistence:
  enabled: false                    # Set to true to enable PVC
  storageClass: "local-path"        # Storage class name (default in k3s)
  size: "1Gi"                       # PVC size
  mountPath: "/app/data"            # Mount path in server container
```

When enabled, creates a PVC and mounts it to the server pod for SQLite database storage.

### Cert-Manager (Optional)
```yaml
certManager:
  enabled: false                    # Set to true after installing cert-manager
  email: "admin@example.com"        # Email for Let's Encrypt
  issuer: "letsencrypt-prod"        # ClusterIssuer name
```

Requires `cert-manager` to be installed in the cluster first:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### Ingress (Optional)
```yaml
ingress:
  enabled: false                    # Set to true to enable
  host: "example.com"               # Domain name
  ingressClass: "traefik"           # Ingress class (k3s default is traefik)
  certManagerAnnotations: false     # Set to true if using cert-manager
```

When enabled:
- Creates an Ingress resource for the client service
- Optionally adds cert-manager annotations for automatic TLS

---

## Usage Examples

### Example 1: Basic Deployment (Ephemeral)
```bash
helm install career-copilot ./k8s/helm/career-copilot \
  --set server.image=ghcr.io/myorg/myrepo-server:latest \
  --set client.image=ghcr.io/myorg/myrepo-client:latest
```

**Characteristics:**
- No persistent storage
- No ingress or TLS
- Data lost on pod restart
- Suitable for testing/dev

### Example 2: Production Ready (with Persistence)
```bash
# First, install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s

# Then deploy with persistent storage and TLS
helm install career-copilot ./k8s/helm/career-copilot \
  --set server.image=ghcr.io/myorg/myrepo-server:latest \
  --set client.image=ghcr.io/myorg/myrepo-client:latest \
  --set persistence.enabled=true \
  --set persistence.size=5Gi \
  --set ingress.enabled=true \
  --set ingress.host=app.example.com \
  --set ingress.certManagerAnnotations=true \
  --set certManager.enabled=true \
  --set certManager.email=admin@example.com
```

**Characteristics:**
- Persistent storage for server data (5Gi)
- Ingress with auto-generated TLS certificate
- Data survives pod restarts
- Accessible via HTTPS at app.example.com

### Example 3: Custom Resource Limits
```bash
helm install career-copilot ./k8s/helm/career-copilot \
  --set server.image=ghcr.io/myorg/myrepo-server:latest \
  --set client.image=ghcr.io/myorg/myrepo-client:latest \
  --set replicaCount=2 \
  --set server.resources.limits.cpu=500m \
  --set server.resources.limits.memory=512Mi \
  --set server.resources.requests.cpu=250m \
  --set server.resources.requests.memory=256Mi \
  --set client.resources.limits.cpu=200m \
  --set client.resources.limits.memory=256Mi
```

---

## Helm Commands

### View Chart Values
```bash
helm values career-copilot
```

### Get Current Release Status
```bash
helm status career-copilot
```

### See Deployment History
```bash
helm history career-copilot
```

### Dry-run (Preview YAML)
```bash
helm install career-copilot ./k8s/helm/career-copilot --dry-run --debug \
  --set server.image=ghcr.io/myorg/myrepo-server:latest \
  --set client.image=ghcr.io/myorg/myrepo-client:latest
```

### Upgrade Existing Release
```bash
helm upgrade career-copilot ./k8s/helm/career-copilot \
  --set server.image=ghcr.io/myorg/myrepo-server:v1.0.0
```

### Rollback to Previous Version
```bash
helm rollback career-copilot 1
```

### Uninstall Release
```bash
helm uninstall career-copilot
```

---

## Kubernetes Verification

### Check Pods
```bash
kubectl get pods -l app=career-copilot-server
kubectl get pods -l app=career-copilot-client
```

### View Pod Logs
```bash
kubectl logs -f deployment/career-copilot-server
kubectl logs -f deployment/career-copilot-client
```

### Check Services
```bash
kubectl get svc -l app=career-copilot-server
```

### Check Ingress
```bash
kubectl get ingress
kubectl describe ingress career-copilot-ingress
```

### Check PVC
```bash
kubectl get pvc
kubectl describe pvc career-copilot-pvc
```

---

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Image pull errors
- Verify image path is correct: `ghcr.io/owner/repo-server:latest`
- Check GHCR credentials if using private images
- Ensure image exists in registry

### PVC not binding
```bash
kubectl describe pvc career-copilot-pvc
```
Check available storage and storage class availability.

### Ingress not routing
```bash
kubectl describe ingress career-copilot-ingress
```
Verify:
- DNS resolves to master node IP
- Traefik is running: `kubectl get pod -n kube-system | grep traefik`
- TLS certificate is issued: `kubectl get certificate`

### Server can't reach database
If using persistence:
```bash
# Verify mount
kubectl exec deployment/career-copilot-server -- ls -la /app/data
```

---

## Custom Values File

Create a `custom-values.yaml`:

```yaml
replicaCount: 2

server:
  image: "ghcr.io/myorg/myrepo-server:v1.0.0"
  port: 3001
  resources:
    limits:
      cpu: "500m"
      memory: "512Mi"
    requests:
      cpu: "250m"
      memory: "256Mi"

client:
  image: "ghcr.io/myorg/myrepo-client:v1.0.0"
  port: 3000

persistence:
  enabled: true
  storageClass: "local-path"
  size: "2Gi"

ingress:
  enabled: true
  host: "myapp.example.com"
  ingressClass: "traefik"
  certManagerAnnotations: true

certManager:
  enabled: true
  email: "ops@example.com"
```

Deploy with custom values:
```bash
helm install career-copilot ./k8s/helm/career-copilot -f custom-values.yaml
```
