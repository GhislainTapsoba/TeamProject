terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket = "teamproject-terraform-state"
    key    = "teamproject/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "digitalocean" {
  token = var.digitalocean_token
}

# Variables
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "deep-technologies.com"
}

variable "subdomain" {
  description = "Subdomain for TeamProject"
  type        = string
  default     = "teamproject"
}

variable "vps_ip_address" {
  description = "IP address of the existing VPS"
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "digitalocean_token" {
  description = "DigitalOcean API token (if using DO)"
  type        = string
  sensitive   = true
  default     = null
}

# Cloudflare DNS Configuration
resource "cloudflare_record" "teamproject_main" {
  zone_id = var.cloudflare_zone_id
  name    = var.subdomain
  value   = var.vps_ip_address
  type    = "A"
  ttl     = 3600
  proxied = false
}

resource "cloudflare_record" "teamproject_wildcard" {
  zone_id = var.cloudflare_zone_id
  name    = "*.${var.subdomain}"
  value   = var.vps_ip_address
  type    = "A"
  ttl     = 3600
  proxied = false
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for the domain"
  type        = string
}

# DigitalOcean Droplet (optional - if creating new VPS)
resource "digitalocean_droplet" "teamproject" {
  count = var.create_new_vps ? 1 : 0

  name   = "teamproject-vps"
  region = var.do_region
  size   = var.do_size
  image  = var.do_image

  ssh_keys = [var.do_ssh_key_fingerprint]

  monitoring  = true
  backups     = true
  ipv6        = true

  tags = ["teamproject", "production"]
}

variable "create_new_vps" {
  description = "Whether to create a new VPS or use existing one"
  type        = bool
  default     = false
}

variable "do_region" {
  description = "DigitalOcean region"
  type        = string
  default     = "ams3"
}

variable "do_size" {
  description = "DigitalOcean droplet size"
  type        = string
  default     = "s-4vcpu-8gb"
}

variable "do_image" {
  description = "DigitalOcean droplet image"
  type        = string
  default     = "ubuntu-22-04-x64"
}

variable "do_ssh_key_fingerprint" {
  description = "SSH key fingerprint for DigitalOcean"
  type        = string
  default     = null
}

# Outputs
output "teamproject_url" {
  description = "Main TeamProject URL"
  value       = "https://${var.subdomain}.${var.domain_name}"
}

output "wildcard_url" {
  description = "Wildcard tenant URL pattern"
  value       = "https://{tenant}.${var.subdomain}.${var.domain_name}"
}

output "vps_ip" {
  description = "VPS IP address"
  value       = var.create_new_vps ? digitalocean_droplet.teamproject[0].ipv4_address : var.vps_ip_address
}
