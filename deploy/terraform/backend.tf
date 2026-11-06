# Remote state — points at the bucket created once by ./bootstrap.
# Terraform doesn't allow variables here, so this value must literally match
# whatever `bootstrap` actually created (its output tells you).
#
# Locking uses S3's own native locking (a conditional write on a lockfile
# object in the bucket) rather than a separate DynamoDB table — the modern
# replacement for the old `dynamodb_table` setting.
terraform {
  backend "s3" {
    bucket       = "skillfusion-terraform-state-013364996908"
    key          = "skillfusion/terraform.tfstate"
    region       = "ap-southeast-2"
    use_lockfile = true
    encrypt      = true
  }
}
