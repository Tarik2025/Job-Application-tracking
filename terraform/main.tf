terraform {
  required_version = ">= 1.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

# Data source for AD
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

# VCN
resource "oci_core_vcn" "career_copilot_vcn" {
  compartment_id = var.compartment_id
  cidr_block     = "10.0.0.0/16"
  display_name   = "career-copilot-vcn"
}

# Internet Gateway
resource "oci_core_internet_gateway" "career_copilot_igw" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.career_copilot_vcn.id
  display_name   = "career-copilot-igw"
}

# Route Table
resource "oci_core_route_table" "career_copilot_rt" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.career_copilot_vcn.id
  display_name   = "career-copilot-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.career_copilot_igw.id
  }
}

# Subnet
resource "oci_core_subnet" "career_copilot_subnet" {
  compartment_id             = var.compartment_id
  vcn_id                     = oci_core_vcn.career_copilot_vcn.id
  cidr_block                 = "10.0.1.0/24"
  route_table_id             = oci_core_route_table.career_copilot_rt.id
  availability_domain        = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name               = "career-copilot-subnet"
}

# Security Group
resource "oci_core_security_group" "career_copilot_sg" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.career_copilot_vcn.id
  display_name   = "career-copilot-sg"

  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    destination = null

    tcp_options {
      min = 22
      max = 22
    }
  }

  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    destination = null

    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol    = "6"
    source      = "0.0.0.0/0"
    destination = null

    tcp_options {
      min = 443
      max = 443
    }
  }

  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
  }
}

# Compute instances
resource "oci_core_instance" "k3s_master" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_id
  display_name        = "k3s-master"
  shape               = "VM.Standard.E2.1.Micro"

  create_vnic_details {
    subnet_id                 = oci_core_subnet.career_copilot_subnet.id
    display_name              = "k3s-master-vnic"
    assign_public_ip          = true
    nsg_ids                   = [oci_core_security_group.career_copilot_sg.id]
    skip_source_dest_check    = false
  }

  source_details {
    source_id   = data.oci_core_images.ubuntu_image.images[0].id
    source_type = "IMAGE"
  }

  metadata = {
    ssh_authorized_keys = file(var.public_key_path)
    user_data          = base64encode(templatefile("${path.module}/scripts/k3s-master-init.sh", {
      k3s_token = random_password.k3s_token.result
    }))
  }

  depends_on = [oci_core_internet_gateway.career_copilot_igw]
}

resource "oci_core_instance" "k3s_worker" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_id
  display_name        = "k3s-worker"
  shape               = "VM.Standard.E2.1.Micro"

  create_vnic_details {
    subnet_id                 = oci_core_subnet.career_copilot_subnet.id
    display_name              = "k3s-worker-vnic"
    assign_public_ip          = true
    nsg_ids                   = [oci_core_security_group.career_copilot_sg.id]
    skip_source_dest_check    = false
  }

  source_details {
    source_id   = data.oci_core_images.ubuntu_image.images[0].id
    source_type = "IMAGE"
  }

  metadata = {
    ssh_authorized_keys = file(var.public_key_path)
    user_data          = base64encode(templatefile("${path.module}/scripts/k3s-worker-init.sh", {
      k3s_url   = "https://${oci_core_instance.k3s_master.private_ip}:6443"
      k3s_token = random_password.k3s_token.result
    }))
  }

  depends_on = [oci_core_instance.k3s_master]
}

# Data source for Ubuntu image
data "oci_core_images" "ubuntu_image" {
  compartment_id           = var.compartment_id
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# Random k3s token
resource "random_password" "k3s_token" {
  length  = 32
  special = true
}

# Outputs
output "k3s_master_public_ip" {
  value       = oci_core_instance.k3s_master.public_ip
  description = "Public IP of k3s master node"
}

output "k3s_worker_public_ip" {
  value       = oci_core_instance.k3s_worker.public_ip
  description = "Public IP of k3s worker node"
}

output "k3s_token" {
  value       = random_password.k3s_token.result
  sensitive   = true
  description = "k3s cluster token"
}
