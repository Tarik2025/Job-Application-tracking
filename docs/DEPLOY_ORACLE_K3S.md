Oracle Cloud (Always Free) + k3s - Complete Deployment Guide

## Overview

This guide walks through deploying Career Copilot to Oracle Cloud Always Free tier using k3s and GitHub Actions.

### Architecture
- **2 Always Free VMs** (VM.Standard.E2.1.Micro each): k3s master + worker
- **GitHub Actions**: CI/CD pipeline (build images → push to GHCR → deploy via Helm)
- **Helm**: Kubernetes package manager for deployment
- **k3s**: Lightweight Kubernetes distribution (includes Traefik ingress)

---

## Part 1: GitHub Secrets & Permissions

### 1.1 Create GitHub Container Registry (GHCR) Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: `GHCR_TOKEN`
4. Scopes: `repo`, `write:packages`, `read:packages`, `delete:packages`
5. Copy the token

### 1.2 Add GitHub Repository Secrets

1. In your repo, go to Settings → Secrets and variables → Actions
2. Click "New repository secret"

Add these secrets:

| Secret Name | Value | Description |
|---|---|---|
| `GHCR_TOKEN` | Your GHCR personal access token from 1.1 | For pushing Docker images to GitHub Container Registry |
| `KUBE_CONFIG` | Base64-encoded kubeconfig (see Part 3) | For deploying to k3s cluster |

### 1.3 Verify GitHub Actions Permissions

1. In repo Settings → Actions → General
2. Ensure "Workflow permissions":
   - ✓ "Read and write permissions"
   - ✓ "Allow GitHub Actions to create and approve pull requests"

---

## Part 2: Oracle Cloud Setup (Automated with Terraform)

### 2.1 Get Oracle Cloud Credentials

1. Login to Oracle Cloud Console
2. Go to Account menu → Tenancy details, note **Tenancy OCID**
3. Go to Account menu → My profile, note **User OCID**
4. Go to Account menu → My profile → API keys
5. Click "Add API key" → Generate API key pair
6. Download the private key (save it securely, e.g., `~/.oci/oci_api_key.pem`)
7. Note the **Fingerprint** shown in the console

### 2.2 Prepare Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values from 2.1. Don't commit this file.

### 2.3 Provision Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

This creates:
- VCN, subnet, internet gateway, security group
- k3s master node (public IP)
- k3s worker node (auto-joins cluster)
- Automatic k3s + Traefik installation

**Save the output:**
```
k3s_master_public_ip = "1.2.3.4"
k3s_worker_public_ip = "5.6.7.8"
```

---

## Part 3: Get kubeconfig & Add to GitHub

### 3.1 Retrieve kubeconfig from Master Node

```bash
MASTER_IP=$(terraform output -raw k3s_master_public_ip)
ssh -i ~/.ssh/id_rsa ubuntu@$MASTER_IP sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config-oracle
```

### 3.2 Update Server Address in kubeconfig

Edit `~/.kube/config-oracle` and replace:
- `server: https://127.0.0.1:6443` → `server: https://$MASTER_IP:6443`

Or use sed:
```bash
sed -i "s/127.0.0.1/$MASTER_IP/g" ~/.kube/config-oracle
```

### 3.3 Verify Connectivity

```bash
kubectl --kubeconfig ~/.kube/config-oracle get nodes
```

Expected output:
```
NAME          STATUS   ROLES                  AGE   VERSION
k3s-master    Ready    control-plane,master   5m    v1.x.x
k3s-worker    Ready    <none>                 3m    v1.x.x
```

### 3.4 Base64 Encode and Add to GitHub Secrets

```bash
cat ~/.kube/config-oracle | base64 | tr -d '\n' | xclip -selection clipboard
# On macOS: ... | pbcopy
```

1. In GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `KUBE_CONFIG`
4. Value: Paste the base64-encoded kubeconfig

---

## Part 4: Configure Helm Values

Update `k8s/helm/career-copilot/values.yaml` for your setup:

### 4.1 Enable Ingress (Optional)

```yaml
ingress:
  enabled: true
  host: "yourdomain.com"
  ingressClass: "traefik"
  certManagerAnnotations: false  # Set to true after installing cert-manager
```

### 4.2 Enable Persistence (Recommended)

```yaml
persistence:
  enabled: true
  storageClass: "local-path"  # Default in k3s
  size: "1Gi"
  mountPath: "/app/data"
```

### 4.3 Enable Cert-Manager for TLS (Optional)

First, install cert-manager in the cluster:

```bash
kubectl --kubeconfig ~/.kube/config-oracle apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
kubectl --kubeconfig ~/.kube/config-oracle wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s
```

Then update values.yaml:

```yaml
certManager:
  enabled: true
  email: "admin@example.com"
  issuer: "letsencrypt-prod"

ingress:
  enabled: true
  host: "yourdomain.com"
  ingressClass: "traefik"
  certManagerAnnotations: true
```

---

## Part 5: Deploy with GitHub Actions

### 5.1 Trigger Build & Push

1. Commit & push changes to your branch
2. Go to GitHub repo → Actions
3. Watch "Build and push images" workflow:
   - Builds server and client Docker images
   - Pushes to ghcr.io with `:latest` tag

Verify images are in GitHub Container Registry:
```bash
# Check server image
curl -s https://ghcr.io/v2/$OWNER/$REPO-server/tags/list | jq .

# Requires authentication for private repos
echo $GHCR_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin
```

### 5.2 Trigger Deploy Workflow (to main branch)

1. Create a PR and merge to `main` (or commit to main)
2. GitHub Actions automatically triggers "Deploy to Kubernetes (Helm)"
3. Watch the workflow logs

Expected output:
```
Release "career-copilot" does not exist. Installing it now.
NAME: career-copilot
LAST DEPLOYED: ...
NAMESPACE: default
STATUS: deployed
```

### 5.3 Verify Deployment

```bash
kubectl --kubeconfig ~/.kube/config-oracle get pods -n default
kubectl --kubeconfig ~/.kube/config-oracle get svc -n default

# Port-forward to test (if no ingress)
kubectl --kubeconfig ~/.kube/config-oracle port-forward svc/career-copilot-client 3000:80
# Open http://localhost:3000
```

---

## Part 6: Access Your Application

### 6.1 With Ingress (DNS + Domain)

If ingress is enabled:

1. Point your domain DNS to the master node public IP:
   ```
   A record: yourdomain.com → $MASTER_IP
   ```

2. Access at `https://yourdomain.com` (if TLS enabled)

### 6.2 Without Ingress (Direct Access)

Port-forward and test:

```bash
# Test server
kubectl --kubeconfig ~/.kube/config-oracle port-forward svc/career-copilot-server 3001:80
curl http://localhost:3001/api/health

# Test client
kubectl --kubeconfig ~/.kube/config-oracle port-forward svc/career-copilot-client 3000:80
curl http://localhost:3000
```

---

## Part 7: Troubleshooting

### Images not pushing to GHCR
- Verify `GHCR_TOKEN` is set in GitHub secrets
- Check token has `write:packages` scope
- Confirm your repo is public (or PAT has correct permissions for private)

### Helm deploy fails
- Verify `KUBE_CONFIG` secret is set and base64-encoded correctly
- Check kubeconfig server address is the master node public IP (not 127.0.0.1)
- Ensure both master and worker nodes are Ready: `kubectl get nodes`

### Server can't connect to database
- Check if persistence is enabled and PVC is bound:
  ```bash
  kubectl get pvc
  kubectl describe pvc career-copilot-pvc
  ```
- If using SQLite, ensure mount path matches server code expectations

### Ingress not working
- Verify Traefik is running: `kubectl get pod -n kube-system | grep traefik`
- Check ingress resource: `kubectl get ingress`
- Verify DNS points to master IP

---

## Part 8: Cleanup & Teardown

To destroy all Oracle Cloud resources:

```bash
cd terraform
terraform destroy
```

To delete Kubernetes resources:

```bash
kubectl --kubeconfig ~/.kube/config-oracle delete namespace default
# Or just delete the release:
helm --kubeconfig ~/.kube/config-oracle uninstall career-copilot -n default
```

---

## Quick Reference

| Task | Command |
|---|---|
| Terraform plan | `cd terraform && terraform plan` |
| Terraform apply | `cd terraform && terraform apply` |
| Get Terraform outputs | `terraform output` |
| SSH to master | `ssh -i ~/.ssh/id_rsa ubuntu@$(terraform output -raw k3s_master_public_ip)` |
| Verify k3s cluster | `kubectl --kubeconfig ~/.kube/config-oracle get nodes` |
| Deploy Helm chart | `helm upgrade --install career-copilot k8s/helm/career-copilot` |
| View Helm values | `helm values career-copilot` |
| View deployment logs | `kubectl logs -f deployment/career-copilot-server` |
| Port-forward | `kubectl port-forward svc/career-copilot-server 3001:80` |

---

## Support

For issues:
1. Check GitHub Actions logs for build/deploy errors
2. SSH to master node and check k3s logs: `journalctl -u k3s -f`
3. Check Kubernetes pod logs: `kubectl describe pod <pod-name>`
4. Check PVC/storage: `kubectl get pvc; kubectl describe pvc <pvc-name>`
