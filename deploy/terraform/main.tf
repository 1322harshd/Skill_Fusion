# The email stack (deploy/terraform/email/) has its own state on purpose —
# see its backend.tf — so a destroy/rebuild of this main stack doesn't
# regenerate SES's DKIM keys, the Route53 zone, or the ACM cert. Reached
# read-only here via remote state.
data "terraform_remote_state" "email" {
  backend = "s3"
  config = {
    bucket = "skillfusion-terraform-state-013364996908"
    key    = "skillfusion/email.tfstate"
    region = "ap-southeast-2"
  }
}

module "network" {
  source      = "./modules/network"
  name_prefix = var.name_prefix
}

module "database" {
  source               = "./modules/database"
  name_prefix          = var.name_prefix
  db_subnet_ids        = module.network.db_subnet_ids
  db_security_group_id = module.network.db_security_group_id
}

module "frontend" {
  source                = "./modules/frontend"
  name_prefix           = var.name_prefix
  bucket_name           = var.frontend_bucket_name
  custom_domain_aliases = [var.domain_name, "www.${var.domain_name}"]
  acm_certificate_arn   = data.terraform_remote_state.email.outputs.cloudfront_cert_arn
}

module "backend_service" {
  source                    = "./modules/backend_service"
  name_prefix               = var.name_prefix
  vpc_id                    = module.network.vpc_id
  public_subnet_ids         = module.network.public_subnet_ids
  alb_security_group_id     = module.network.alb_security_group_id
  backend_security_group_id = module.network.backend_security_group_id
  db_secret_arn             = module.database.db_secret_arn
  backend_image             = var.backend_image
  custom_domain_aliases     = ["api.${var.domain_name}"]
  acm_certificate_arn       = data.terraform_remote_state.email.outputs.cloudfront_cert_arn
  cors_allowed_origins      = "https://${var.domain_name},https://www.${var.domain_name},${module.frontend.site_url}"
  frontend_url              = "https://${var.domain_name}"
  email_secret_arn          = data.terraform_remote_state.email.outputs.smtp_secret_arn
  email_smtp_endpoint       = data.terraform_remote_state.email.outputs.smtp_endpoint
  email_from_address        = "noreply@${var.domain_name}"
  llm_api_url               = var.llm_api_url
}

# CloudFront's hosted zone id is the same fixed value for every
# distribution, in every account — it's not specific to ours.
locals {
  cloudfront_hosted_zone_id = "Z2FDTNDATAQYW2"
}

resource "aws_route53_record" "frontend_apex" {
  zone_id = data.terraform_remote_state.email.outputs.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.frontend.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "frontend_www" {
  zone_id = data.terraform_remote_state.email.outputs.route53_zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.frontend.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "backend_api" {
  zone_id = data.terraform_remote_state.email.outputs.route53_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.backend_service.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}
