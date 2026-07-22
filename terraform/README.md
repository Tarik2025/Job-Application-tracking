# Terraform: Oracle Cloud k3s Infrastructure

This Terraform configuration automates provisioning of a k3s Kubernetes cluster on Oracle Cloud Always Free tier.

## Prerequisites

1. Oracle Cloud account with Always Free tier access
2. Terraform >= 1.0 installed
3. Oracle Cloud CLI installed and configured
4. SSH key pair created

## Setup

### 1. Get Oracle Cloud credentials

```bash
# Create an API key in Oracle Cloud Console
# Download the private key and note:
# - Tenancy OCID
# - User OCID
# - Fingerprint
# - Compartment OCID (usually root compartment)
```

### 2. Configure Terraform variables

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your Oracle Cloud credentials
```

**Important:** Add `terraform.tfvars` to `.gitignore` to avoid committing credentials.

### 3. Initialize Terraform

```bash
cd terraform
terraform init
```

### 4. Plan and apply

```bash
terraform plan
terraform apply
```

This creates:
- VCN (Virtual Cloud Network) with subnet
- Internet Gateway and Route Table
- Security Group (opens ports 22, 80, 443)
- 2 VM instances (master + worker)
- Automatic k3s installation via cloud-init

### 5. Get kubeconfig and retrieve it

```bash
# Get master node IP from Terraform output
MASTER_IP=$(terraform output -raw k3s_master_public_ip)

# SSH and retrieve kubeconfig
ssh -i ~/.ssh/id_rsa ubuntu@$MASTER_IP sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config-oracle

# Update the server address in the kubeconfig
sed -i "s/127.0.0.1/$MASTER_IP/g" ~/.kube/config-oracle

# Verify connectivity
kubectl --kubeconfig ~/.kube/config-oracle get nodes
```

### 6. Add kubeconfig to GitHub secrets

```bash
# Base64 encode and add to GitHub secrets
cat ~/.kube/config-oracle | base64 | tr -d '\n' | pbcopy
# In GitHub repo Settings > Secrets > New secret:
# Name: KUBE_CONFIG
# Value: <paste the base64-encoded kubeconfig>
```

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

## Notes

- k3s includes Traefik ingress controller by default
- Uses local-path provisioner for storage (suitable for Always Free tier)
- Both VMs are E2.1.Micro (Always Free eligible)
- Ensure SSH key path is correct in terraform.tfvars
