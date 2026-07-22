# GitHub Actions & GHCR Setup Guide

This guide walks through setting up GitHub Secrets, Container Registry permissions, and verifying GitHub Actions workflows.

## Part 1: GitHub Container Registry (GHCR) Setup

### 1.1 Verify Your Repository Visibility

For public repositories, GITHUB_TOKEN has sufficient permissions by default.
For private repositories, you need a Personal Access Token (PAT).

### 1.2 Create a Personal Access Token (PAT) for Private Repos

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Fill in:
   - **Note**: `GHCR-Deploy`
   - **Expiration**: 90 days (or custom)
   - **Scopes**:
     - ✓ `repo` (full control)
     - ✓ `write:packages` (publish packages)
     - ✓ `read:packages` (download packages)
     - ✓ `delete:packages` (delete packages)
4. Click "Generate token"
5. **Copy the token immediately** (you won't see it again)

### 1.3 Add Secrets to Your Repository

1. Go to your repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"

Add these secrets:

#### For Public Repos (Default):
| Secret Name | Value | Purpose |
|---|---|---|
| `KUBE_CONFIG` | Base64-encoded kubeconfig (see deployment guide) | Kubernetes cluster access |

The built-in `GITHUB_TOKEN` is used for GHCR push.

#### For Private Repos (Extra):
| Secret Name | Value | Purpose |
|---|---|---|
| `GHCR_TOKEN` | Your PAT from 1.2 | Docker registry authentication |
| `KUBE_CONFIG` | Base64-encoded kubeconfig | Kubernetes cluster access |

### 1.4 Update Workflows for Private Repos (Optional)

If using a private repo, update `.github/workflows/build-and-push.yml`:

```yaml
- name: Log in to GitHub Container Registry
  uses: docker/login-action@v2
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GHCR_TOKEN }}  # Change from GITHUB_TOKEN
```

---

## Part 2: Repository Permissions

### 2.1 Actions Permissions

1. Go to Settings → Actions → General
2. Under "Workflow permissions":
   - ✓ "Read and write permissions"
   - ✓ "Allow GitHub Actions to create and approve pull requests"
3. Click "Save"

### 2.2 Secrets Access in Workflows

By default, secrets are accessible in workflows. Verify:

1. Settings → Secrets and variables → Actions
2. Secrets list should show:
   - ✓ `KUBE_CONFIG` (value hidden)
   - ✓ `GHCR_TOKEN` (if using private repo)

---

## Part 3: Workflow Files

### 3.1 Build & Push Workflow (`.github/workflows/build-and-push.yml`)

Triggers on: Any push to any branch

**Key actions:**
- Docker/build-push-action pushes images to ghcr.io
- Image tags: `ghcr.io/{owner}/{repo}-{server|client}:latest`
- Uses GITHUB_TOKEN by default (public repos) or GHCR_TOKEN (private repos)

**Verify:**
1. Go to repo → Actions → "Build and push images"
2. Click latest run
3. Check "Build and push server image" step
4. Look for success: `digest: sha256:xxxxx`

### 3.2 Deploy Workflow (`.github/workflows/deploy.yml`)

Triggers on: Pushes to `main` branch only

**Key actions:**
- Decodes KUBE_CONFIG from base64
- Installs Helm and kubectl
- Runs `helm upgrade --install`

**Verify:**
1. Go to repo → Actions → "Deploy to Kubernetes (Helm)"
2. Merge a PR to main to trigger
3. Check "Deploy Helm chart" step
4. Look for: `STATUS: deployed`

---

## Part 4: Check GHCR Images

### 4.1 Verify Images Were Published

```bash
# Public repo (no auth needed):
curl -s https://ghcr.io/v2/{OWNER}/{REPO}-server/tags/list | jq .

# Example output:
# {
#   "name": "owner/repo-server",
#   "tags": ["latest"]
# }
```

### 4.2 Login to GHCR and Pull

```bash
# Login (only needed once)
echo $GHCR_TOKEN | docker login ghcr.io -u {GITHUB_USERNAME} --password-stdin

# Pull and run locally (optional)
docker pull ghcr.io/{OWNER}/{REPO}-server:latest
docker run -p 3001:3001 ghcr.io/{OWNER}/{REPO}-server:latest
```

### 4.3 View Images in GitHub UI

1. Go to repo → Packages (right sidebar)
2. Should see:
   - `{repo}-server`
   - `{repo}-client`
3. Click each to see pushed image tags

---

## Part 5: Troubleshooting

### Workflow: "Build and push" fails

**Error:** `failed to push {image}: authentication required`

**Fix:**
- Verify GHCR_TOKEN is set in GitHub secrets
- Ensure token has `write:packages` scope
- For private repos, confirm GHCR_TOKEN is being used (not GITHUB_TOKEN)
- Restart workflow by clicking "Re-run jobs"

### Workflow: "Deploy" fails

**Error:** `kubeconfig: no such file or directory` or `invalid kubeconfig`

**Fix:**
- Verify KUBE_CONFIG secret is set
- Base64-encode correctly: `cat kubeconfig | base64 | tr -d '\n'`
- Ensure kubeconfig server address is the master node public IP (not 127.0.0.1)
- Test locally: `echo "$KUBE_CONFIG" | base64 --decode > /tmp/config && kubectl --kubeconfig=/tmp/config get nodes`

### Images not appearing in GHCR

**Error:** `skipped: no push requested`

**Fix:**
- Ensure `push: true` in docker/build-push-action step
- Verify tags are specified (e.g., `ghcr.io/...`)
- Check workflow uses correct registry login

### Helm deploy shows "release already exists"

**Expected behavior** - on second push, Helm upgrades the release (not error).

To verify:
```bash
helm list
helm history career-copilot
```

---

## Part 6: Manual Testing

### Test Build Without Pushing

```bash
docker build -f client/Dockerfile -t career-copilot-client:test client/
docker build -f server/Dockerfile -t career-copilot-server:test server/
```

### Test Helm Chart Locally

```bash
helm template career-copilot k8s/helm/career-copilot/ \
  --set server.image=ghcr.io/owner/repo-server:latest \
  --set client.image=ghcr.io/owner/repo-client:latest
```

### Test Deploy Script Manually

```bash
bash scripts/deploy.sh $(cat ~/.kube/config-oracle | base64 | tr -d '\n')
```

---

## Part 7: Workflow Status Badge

Add a status badge to your README:

```markdown
![Build and push images](https://github.com/{owner}/{repo}/actions/workflows/build-and-push.yml/badge.svg)
![Deploy to Kubernetes](https://github.com/{owner}/{repo}/actions/workflows/deploy.yml/badge.svg)
```

---

## Quick Checklist

- [ ] GitHub repo secrets set (KUBE_CONFIG, optionally GHCR_TOKEN)
- [ ] Actions permissions set to "Read and write"
- [ ] Build workflow triggers and pushes images to GHCR
- [ ] Deploy workflow triggers on push to main
- [ ] Images appear in GitHub Packages
- [ ] Helm chart values updated for your environment
- [ ] KUBE_CONFIG base64-encoded correctly
- [ ] k3s master and worker nodes are Ready
