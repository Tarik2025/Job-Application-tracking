#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/deploy.sh <kubeconfig-base64>
# This script decodes the provided kubeconfig (base64) into $HOME/.kube/config and runs helm upgrade

if [ -z "${1-}" ]; then
  echo "Usage: $0 <KUBE_CONFIG_BASE64>"
  exit 1
fi

mkdir -p "$HOME/.kube"
echo "$1" | base64 --decode > "$HOME/.kube/config"

helm upgrade --install career-copilot k8s/helm/career-copilot --namespace default --create-namespace \
  --set server.image="ghcr.io/$(git config --get remote.origin.url | sed -E 's/.*[:/]([^/]+\/[^/.]+)(\.git)?$/\1/')-server:latest" \
  --set client.image="ghcr.io/$(git config --get remote.origin.url | sed -E 's/.*[:/]([^/]+\/[^/.]+)(\.git)?$/\1/')-client:latest"
