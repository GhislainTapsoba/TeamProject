# Terraform Infrastructure for TeamProject

This directory contains Terraform configuration for managing the DNS and infrastructure for TeamProject SaaS.

## 🔒 Security Warning

- **NEVER commit** `terraform.tfvars` to version control
- All sensitive variables are marked as `sensitive = true`
- Backend S3 is disabled by default - configure explicitly for production
- See [SECURITY.md](../SECURITY.md) for complete security guidelines

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

## Production Setup (S3 Backend)

For production, enable the S3 backend in `main.tf`:

```hcl
backend "s3" {
  bucket         = "your-existing-bucket"
  key            = "teamproject/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true  # ⚠️ REQUIRED for security
  dynamodb_table = "teamproject-terraform-locks"  # For state locking
}
```

Then create the DynamoDB table:
```bash
aws dynamodb create-table \
  --table-name teamproject-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
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

## Security Measures

✅ **All sensitive variables marked as `sensitive = true`**
✅ **Backend S3 disabled by default (requires explicit config)**
✅ **State encryption required in production**
✅ **State locking with DynamoDB (prevents concurrent conflicts)**
✅ **No hardcoded credentials in Terraform files**

## Outputs

After applying, Terraform will output:
- Main TeamProject URL
- Wildcard tenant URL pattern
- VPS IP address

## CI/CD Integration

⚠️ **SECURITY: Do not automate Terraform in CI/CD without proper safeguards**

If you integrate Terraform with GitHub Actions:
1. Use environment variables for secrets
2. Enable branch protection on main
3. Require manual approval for state changes
4. Use separate workspaces for dev/staging/prod

Example with safeguards:
```yaml
- name: Terraform Plan
  run: |
    cd terraform
    terraform plan -out=tfplan

- name: Terraform Apply (Manual Approval)
  if: github.ref == 'refs/heads/main'
  run: |
    cd terraform
    terraform apply tfplan
```

## Troubleshooting

### State Lock Issues
If you encounter state locking errors:
```bash
terraform force-unlock <LOCK_ID>
```

### Backend Configuration Issues
If backend configuration fails:
1. Verify AWS credentials are set
2. Ensure S3 bucket exists
3. Check DynamoDB table is created
4. Verify IAM permissions

### DNS Propagation
DNS changes may take up to 24 hours to propagate:
```bash
# Check DNS propagation
dig teamproject.deep-technologies.com
dig test.teamproject.deep-technologies.com
```
