# Deliberately separate state from the main stack (deploy/terraform/) — the
# SES domain identity and its DKIM key pair shouldn't get destroyed and
# regenerated every time the main stack (ECS/RDS/CloudFront) is torn down
# and rebuilt, since that would invalidate the DNS records already added
# at the registrar and force re-verification each cycle.
terraform {
  backend "s3" {
    bucket       = "skillfusion-terraform-state-013364996908"
    key          = "skillfusion/email.tfstate"
    region       = "ap-southeast-2"
    use_lockfile = true
    encrypt      = true
  }
}
