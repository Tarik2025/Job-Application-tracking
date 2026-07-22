Oracle Cloud (Always Free) + k3s - Quick deploy guide

Overview
- Use Oracle Cloud Always Free tier (2 VMs) to host a lightweight k3s Kubernetes cluster.
- Use GitHub Actions to build images and push to GHCR, and to deploy Helm charts to the k3s cluster.

Steps (high level):
1. Create Oracle Cloud account and provision two small VMs (VM.Standard.E2.1.Micro or ARM equivalent) in the same VCN.
2. SSH to the primary VM and install k3s:
   curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644" K3S_TOKEN=mytoken sh -
3. Join the second VM as an agent using the K3S_URL and K3S_TOKEN from the first node.
4. Install an ingress controller (Traefik is bundled with k3s) or install nginx-ingress if preferred.
5. Obtain the kubeconfig from the primary node (~/.kube/config) and base64-encode it:
   cat ~/.kube/config | base64 | tr -d '\n'
6. In your GitHub repo, add a secret named KUBE_CONFIG with the base64 value.
7. Ensure GITHUB Actions workflow (build-and-push) runs on push and pushes images to ghcr.io.
8. Push to main to trigger the deploy workflow. The deploy workflow reads KUBE_CONFIG and runs Helm to install/upgrade the chart.

Notes & extras
- For TLS in production, get a domain and configure cert-manager + Let's Encrypt in the cluster.
- For persistent SQLite data consider using a PVC or migrate to a managed DB (free options limited).
- GHCR: public repos can push using GITHUB_TOKEN; for private repos ensure permissions are set.

If you want, I can:
- Create Terraform or step-by-step shell commands to provision the Oracle VMs and automate k3s install
- Add cert-manager and an example values.yaml for a domain
- Add PVC and migration steps for the SQLite DB
