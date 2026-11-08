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
  source      = "./modules/frontend"
  name_prefix = var.name_prefix
  bucket_name = var.frontend_bucket_name
}

# The email stack (deploy/terraform/email/) has its own state on purpose —
# see its backend.tf — so a destroy/rebuild of this main stack doesn't
# regenerate SES's DKIM keys. Reached read-only here via remote state.
data "terraform_remote_state" "email" {
  backend = "s3"
  config = {
    bucket = "skillfusion-terraform-state-013364996908"
    key    = "skillfusion/email.tfstate"
    region = "ap-southeast-2"
  }
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
  frontend_origin           = module.frontend.site_url
  email_secret_arn          = data.terraform_remote_state.email.outputs.smtp_secret_arn
  email_smtp_endpoint       = data.terraform_remote_state.email.outputs.smtp_endpoint
  email_from_address        = "noreply@${var.domain_name}"
}
