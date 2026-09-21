# Terraform Infrastructure for TeamProject

This directory contains Terraform configuration for managing the DNS and infrastructure for TeamProject SaaS.

## Prerequisites

- Terraform >= 1.5.0
- Cloudflare account with domain configured
- DigitalOcean account (if creating new VPS)

## Setup

1. **Install Terraform:**
   ```bash
   # On macOS
   brew install terraform

   # On Linux
   wget https://releases.hashicorp.com/terraform/<version>/terraform_<version>_linux_amd64.zip
   unzip terraform_<version>_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

2. **Configure Cloudflare:**
   - Go to https://dash.cloudflare.com/profile/api-tokens
   - Create a new token with permissions:
     - Zone:DNS (Edit)
     - Zone:Zone (Read)
   - Find your Zone ID in Cloudflare dashboard > Your domain > Overview

3. **Copy variables file:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

4. **Edit terraform.tfvars** with your actual values:
   ```hcl
   cloudflare_zone_id = "your_actual_zone_id"
   cloudflare_api_token = "your_actual_api_token"
   vps_ip_address = "your.vps.ip.address"
   ```

## Usage

### Initialize Terraform
```bash
terraform init
```

### Plan changes
```bash
terraform plan
```

### Apply changes
```bash
terraform apply
```

### Destroy infrastructure
```bash
terraform destroy
```

## Configuration Options

### Using Existing VPS (Recommended)
Set in `terraform.tfvars`:
```hcl
create_new_vps = false
vps_ip_address = "your.existing.vps.ip"
```

### Creating New DigitalOcean Droplet
Set in `terraform.tfvars`:
```hcl
create_new_vps = true
digitalocean_token = "your_do_token"
do_region = "ams3"  # Choose region closest to your users
do_size = "s-4vcpu-8gb"  # Adjust based on needs
do_ssh_key_fingerprint = "your_ssh_key_fingerprint"
```

## DNS Records Created

This configuration creates:
- `teamproject.deep-technologies.com` → VPS IP
- `*.teamproject.deep-technologies.com` → VPS IP (wildcard for multi-tenant)

## Security Notes

- **NEVER commit** `terraform.tfvars` to version control
- Store sensitive values in environment variables or secret managers
- Use `.tfstate` encryption in production
- Enable state locking with a backend (S3 + DynamoDB recommended)

## Outputs

After applying, Terraform will output:
- Main TeamProject URL
- Wildcard tenant URL pattern
- VPS IP address

## CI/CD Integration

The GitHub Actions workflow can be extended to run Terraform:
```yaml
- name: Terraform Apply
  run: |
    cd terraform
    terraform init
    terraform apply -auto-approve
```
