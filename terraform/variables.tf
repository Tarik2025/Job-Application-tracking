variable "tenancy_ocid" {
  description = "Oracle Cloud tenancy OCID"
  type        = string
  sensitive   = true
}

variable "user_ocid" {
  description = "Oracle Cloud user OCID"
  type        = string
  sensitive   = true
}

variable "fingerprint" {
  description = "Fingerprint of the API key"
  type        = string
  sensitive   = true
}

variable "private_key_path" {
  description = "Path to the private key file"
  type        = string
}

variable "public_key_path" {
  description = "Path to the public SSH key"
  type        = string
}

variable "region" {
  description = "Oracle Cloud region (e.g., us-phoenix-1, ap-mumbai-1)"
  type        = string
  default     = "ap-mumbai-1"
}

variable "compartment_id" {
  description = "Compartment OCID for resources"
  type        = string
  sensitive   = true
}
