#!/usr/bin/env bash
set -euo pipefail

# k3s worker initialization script
# This script installs k3s agent (worker node) on Ubuntu 22.04

echo "Installing k3s worker node..."

# Update system
apt-get update
apt-get install -y curl

# Install k3s agent
export K3S_URL="${k3s_url}"
export K3S_TOKEN="${k3s_token}"

curl -sfL https://get.k3s.io | sh -

echo "k3s worker installation complete"

# Wait for node registration
sleep 30

echo "Worker node setup complete"
