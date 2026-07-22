#!/usr/bin/env bash
set -euo pipefail

# k3s master initialization script
# This script installs k3s master node on Ubuntu 22.04

echo "Installing k3s master node..."

# Update system
apt-get update
apt-get install -y curl

# Install k3s master
export INSTALL_K3S_EXEC="--write-kubeconfig-mode 644"
export K3S_TOKEN="${k3s_token}"

curl -sfL https://get.k3s.io | sh -

echo "k3s master installation complete"

# Wait for node to be ready
sleep 30
/usr/local/bin/kubectl wait --for=condition=Ready nodes --all --timeout=300s || true

echo "Master node setup complete. Get kubeconfig with: ssh -i <key> ubuntu@<master-ip> sudo cat /etc/rancher/k3s/k3s.yaml"
