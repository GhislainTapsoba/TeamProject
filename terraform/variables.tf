variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for the domain (find in Cloudflare dashboard > Your domain > Overview > Zone ID)"
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone:DNS and Zone:Zone permissions (create at https://dash.cloudflare.com/profile/api-tokens)"
  type        = string
  sensitive   = true
}

variable "vps_ip_address" {
  description = "IP address of the existing VPS (if create_new_vps = false)"
  type        = string
}

variable "create_new_vps" {
  description = "Set to true to create a new DigitalOcean droplet, false to use existing VPS"
  type        = bool
  default     = false
}

variable "digitalocean_token" {
  description = "DigitalOcean API token (required if create_new_vps = true)"
  type        = string
  sensitive   = true
  default     = null
}

variable "do_region" {
  description = "DigitalOcean region for new droplet (e.g., ams3, nyc3, sfo2)"
  type        = string
  default     = "ams3"
}

variable "do_size" {
  description = "DigitalOcean droplet size (e.g., s-2vcpu-4gb, s-4vcpu-8gb)"
  type        = string
  default     = "s-4vcpu-8gb"
}

variable "do_image" {
  description = "DigitalOcean droplet image slug (e.g., ubuntu-22-04-x64)"
  type        = string
  default     = "ubuntu-22-04-x64"
}

variable "do_ssh_key_fingerprint" {
  description = "SSH key fingerprint for DigitalOcean (required if create_new_vps = true)"
  type        = string
  default     = null
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "deep-technologies.com"
}

variable "subdomain" {
  description = "Subdomain for TeamProject"
  type        = string
  default     = "teamproject"
}
