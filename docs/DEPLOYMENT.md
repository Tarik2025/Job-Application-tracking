# Career Copilot - Deployment & CI/CD Guide

Complete guide for deploying Career Copilot to Kubernetes on Oracle Cloud Always Free tier with automated CI/CD via GitHub Actions.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Guides](#detailed-guides)
5. [Architecture](#architecture)
6. [Troubleshooting](#troubleshooting)

## 🎯 Overview

This deployment stack provides:
- **Containerization**: Docker images for server (Node.js) and client (Next.js)
- **Kubernetes**: k3s lightweight distribution on Oracle Cloud Always Free VMs
- **CI/CD**: GitHub Actions to build, push images to GHCR, and deploy via Helm
- **Ingress**: Traefik (included in k3s) for routing and optional TLS
- **Persistence**: Optional PVC for database storage (SQLite)
- **TLS**: Optional automatic certificate management via cert-manager and Let's Encrypt

## ✅ Prerequisites

### Local Machine
- [ ] Terraform >= 1.0
- [ ] kubectl >= 1.24
- [ ] Helm >= 3.10
- [ ] Docker (for local testing)
- [ ] SSH key pair (for Oracle VM access)
- [ ] Git configured for pushing

### GitHub
- [ ] Repository cloned and ready
- [ ] GitHub Actions enabled (default for new repos)
- [ ] Access to create repository secrets

### Oracle Cloud
- [ ] Always Free account created
- [ ] API credentials obtained (Tenancy OCID, User OCID, Fingerprint)
- [ ] Private API key downloaded

## 🚀 Quick Start (5 Steps)

### Step 1: Add GitHub Secrets
```bash
# Generate GHCR token (for private repos; skip for public)
# Navigate to GitHub → Settings → Developer settings → Personal access tokens
# Create token with write:packages scope
```

In GitHub repo Settings → Secrets and variables → Actions:

**For public repos:**
- Add secret: `KUBE_CONFIG` = `<base64-encoded-kubeconfig>` (fill after Step 4)

**For private repos:**
- Add secret: `GHCR_TOKEN` = `<your-pat-token>`
- Add secret: `KUBE_CONFIG` = `<base64-encoded-kubeconfig>` (fill after Step 4)

### Step 2: Configure & Run Terraform
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your Oracle Cloud credentials

terraform init
terraform plan
terraform apply
```

Save the output:
```
k3s_master_public_ip = "1.2.3.4"
k3s_worker_public_ip = "5.6.7.8"
```

### Step 3: Get Kubeconfig
```bash
MASTER_IP=$(terraform output -raw k3s_master_public_ip)
ssh -i ~/.ssh/id_rsa ubuntu@$MASTER_IP sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config-oracle

# Update server address (replace 127.0.0.1 with master IP)
sed -i "s/127.0.0.1/$MASTER_IP/g" ~/.kube/config-oracle

# Verify
kubectl --kubeconfig ~/.kube/config-oracle get nodes
```

### Step 4: Add KUBE_CONFIG Secret to GitHub
```bash
# Base64 encode kubeconfig
cat ~/.kube/config-oracle | base64 | tr -d '\n' > /tmp/kube-config-b64.txt

# Copy to clipboard and add to GitHub Secrets as KUBE_CONFIG
```

### Step 5: Trigger CI/CD Pipeline
```bash
# Push to any branch to trigger build-and-push workflow
git add .
git commit -m "Deploy to k3s"
git push

# After images are built, push to main to trigger deploy
git checkout main
git merge <your-branch>
git push origin main
```

Monitor in GitHub Actions:
- Build and push images: 5-10 minutes
- Deploy to k3s: 2-3 minutes

---

## 📚 Detailed Guides

### For GitHub & GHCR Setup
→ See: **[docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md)**

Topics:
- Creating Personal Access Tokens
- Setting repository secrets
- Verifying GHCR image pushes
- Troubleshooting authentication

### For Oracle Cloud & Terraform
→ See: **[terraform/README.md](terraform/README.md)**

Topics:
- Getting Oracle Cloud credentials
- Configuring Terraform variables
- Provisioning VMs and k3s cluster
- SSH access to nodes

### For Kubernetes & Helm Deployment
→ See: **[k8s/helm/README.md](k8s/helm/README.md)**

Topics:
- Helm chart configuration
- Customizing values.yaml
- Enabling persistence and TLS
- Troubleshooting pod issues

### For Complete Deployment Walkthrough
→ See: **[docs/DEPLOY_ORACLE_K3S.md](docs/DEPLOY_ORACLE_K3S.md)**

Topics:
- Step-by-step part-by-part guide
- GitHub secrets in detail
- Kubeconfig setup
- Helm values customization
- Accessing your application

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ GitHub Actions Workflows                              │  │
│  ├─ build-and-push.yml (any branch push)                │  │
│  │  └─ Builds Docker images → Pushes to GHCR            │  │
│  ├─ deploy.yml (main branch push)                       │  │
│  │  └─ Reads KUBE_CONFIG secret → Helm upgrade          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────┴──────────────────┐
        ↓                                     ↓
  ┌──────────────────┐          ┌──────────────────────┐
  │  GHCR            │          │  k3s Kubernetes      │
  │  (Docker images) │          │  (Helm deployment)   │
  │                  │          │                      │
  │ - server:latest  │          │ Namespace: default   │
  │ - client:latest  │          │                      │
  └──────────────────┘          │ Deployments:         │
                                │  - career-copilot    │
                                │    -server           │
                                │  - career-copilot    │
                                │    -client           │
                                │                      │
                                │ Services:            │
                                │  - career-copilot    │
                                │    -server (ClusterIP)
                                │  - career-copilot    │
                                │    -client (ClusterIP)
                                │                      │
                                │ Optional:            │
                                │  - Ingress (Traefik) │
                                │  - PVC (persistence) │
                                │  - Cert-Issuer (TLS) │
                                └──────────────────────┘
                                        ↓
                        ┌───────────────┴───────────────┐
                        ↓                               ↓
        ┌───────────────────────┐       ┌───────────────────────┐
        │ Oracle Cloud VMs      │       │ Oracle Cloud VMs      │
        │ k3s Master Node       │◄──────┤ k3s Worker Node       │
        │ - 2 CPU cores        │       │ - 2 CPU cores        │
        │ - 1 GB RAM           │       │ - 1 GB RAM           │
        │ - Public IP: 1.2.3.4 │       │ - Private IP         │
        │                      │       │                      │
        │ Traefik Ingress      │       │ Pod Scheduling       │
        │ kubectl/k3s          │       │                      │
        └───────────────────────┘       └───────────────────────┘
```

---

## 🔧 Component Overview

### Dockerfiles
- **client/Dockerfile**: Multi-stage Next.js build
- **server/Dockerfile**: Node.js production runtime

### GitHub Actions
- **.github/workflows/build-and-push.yml**: Build & push to GHCR (any branch)
- **.github/workflows/deploy.yml**: Deploy via Helm (main branch only)

### Kubernetes / Helm
- **k8s/helm/career-copilot/Chart.yaml**: Chart metadata
- **k8s/helm/career-copilot/values.yaml**: Configuration defaults
- **k8s/helm/career-copilot/templates/**: Deployment manifests
  - deployment-server.yaml
  - deployment-client.yaml
  - service-server.yaml
  - service-client.yaml
  - ingress.yaml (optional)
  - pvc.yaml (optional persistence)
  - cert-issuer.yaml (optional TLS)

### Infrastructure / Terraform
- **terraform/main.tf**: VCN, security group, compute instances
- **terraform/variables.tf**: Input variable definitions
- **terraform/terraform.tfvars.example**: Example configuration
- **terraform/scripts/**: Cloud-init scripts for k3s installation

### Deployment Scripts
- **scripts/deploy.sh**: Manual Helm deployment helper (decodes KUBE_CONFIG and applies Helm chart)

---

## 📖 Common Workflows

### Workflow 1: Local Development
```bash
# Clone, install dependencies, run locally
npm install --prefix client
npm install --prefix server
npm run dev --prefix client  # localhost:3000
npm run start --prefix server # localhost:3001
```

### Workflow 2: Test Docker Build Locally
```bash
docker build -f client/Dockerfile -t career-copilot-client:test client/
docker build -f server/Dockerfile -t career-copilot-server:test server/

docker run -p 3000:3000 career-copilot-client:test
docker run -p 3001:3001 career-copilot-server:test
```

### Workflow 3: Deploy to k3s (Automated via GitHub Actions)
```bash
git add .
git commit -m "Release v1.0"
git push origin feature-branch     # Triggers build-and-push
git push origin main               # Triggers deploy
# Watch Actions tab for progress
```

### Workflow 4: Deploy to k3s (Manual with Helm)
```bash
kubectl config use-context <context-name>
helm upgrade --install career-copilot k8s/helm/career-copilot \
  --set server.image=ghcr.io/owner/repo-server:v1.0 \
  --set client.image=ghcr.io/owner/repo-client:v1.0 \
  --set persistence.enabled=true
```

### Workflow 5: Update After Code Changes
```bash
# 1. Modify code, commit, push
git add .
git commit -m "Fix bug"
git push

# 2. Wait for build-and-push to complete (new :latest image)

# 3. Merge to main or trigger deploy
git push origin main

# 4. Deploy workflow runs automatically, Helm redeploys pods with new image
```

---

## 🐛 Troubleshooting

### Docker Build Fails
**Problem**: `npm ERR! code E...`

**Solution**:
1. Ensure node_modules are in .dockerignore
2. Verify Dockerfile RUN commands are correct
3. Build locally: `docker build -f client/Dockerfile -t test client/`

### GHCR Push Fails
**Problem**: `failed to push: authentication required`

**Solution**:
1. Verify GHCR_TOKEN or GITHUB_TOKEN is in GitHub secrets
2. Ensure token has write:packages scope
3. Check image tag is correct: `ghcr.io/{owner}/{repo}-{service}:latest`

### Helm Deploy Fails
**Problem**: `kubeconfig: invalid` or timeout

**Solution**:
1. Verify KUBE_CONFIG is base64-encoded: `echo "$KUBE_CONFIG" | base64 -d | head -5`
2. Ensure server address is master node IP (not 127.0.0.1)
3. Verify k3s nodes are Ready: `kubectl get nodes`

### Pod Stuck in Pending
**Problem**: Pod doesn't start

**Solution**:
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```
Common causes:
- Image pull errors (check image path and credentials)
- Insufficient resources (check node capacity)
- Storage issues (verify PVC is bound)

### No Ingress Access
**Problem**: Can't reach app via domain

**Solution**:
1. Verify DNS resolves to master IP: `nslookup yourdomain.com`
2. Check Traefik running: `kubectl get pod -n kube-system | grep traefik`
3. Check Ingress created: `kubectl get ingress`
4. Verify TLS cert (if enabled): `kubectl get certificate`

---

## 📞 Support Resources

| Issue | Reference |
|---|---|
| GitHub secrets & GHCR | [docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md) |
| Oracle Cloud & Terraform | [terraform/README.md](terraform/README.md) |
| Kubernetes & Helm | [k8s/helm/README.md](k8s/helm/README.md) |
| Complete walkthrough | [docs/DEPLOY_ORACLE_K3S.md](docs/DEPLOY_ORACLE_K3S.md) |

---

## ⚡ Next Steps

1. **Complete Quick Start** (above)
2. **Review architecture** to understand the flow
3. **Read detailed guides** for your specific task:
   - Setting up GitHub? → GITHUB_SETUP.md
   - Provisioning Oracle VMs? → terraform/README.md
   - Customizing Helm? → k8s/helm/README.md
   - Full walkthrough? → DEPLOY_ORACLE_K3S.md
4. **Monitor GitHub Actions** as workflows run
5. **Access your application** once deployed

---

## 📝 Key Files

| File | Purpose |
|---|---|
| client/Dockerfile | Next.js production build |
| server/Dockerfile | Node.js server runtime |
| .github/workflows/build-and-push.yml | CI pipeline (build & push images) |
| .github/workflows/deploy.yml | CD pipeline (deploy to k3s) |
| k8s/helm/career-copilot/ | Helm chart (Kubernetes manifests) |
| terraform/main.tf | Infrastructure as code (Oracle VMs) |
| scripts/deploy.sh | Manual deployment helper |
| docs/GITHUB_SETUP.md | GitHub Actions & GHCR guide |
| docs/DEPLOY_ORACLE_K3S.md | Complete deployment walkthrough |

---

## License

This deployment configuration is part of Career Copilot. See LICENSE for details.
