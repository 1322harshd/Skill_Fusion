# One-time setup for Terraform's own remote state storage. This has to exist
# BEFORE the main config can use an S3 backend, so it's a separate, tiny
# Terraform config with its own (local) state — apply it once by hand:
#
#   cd deploy/terraform/bootstrap
#   terraform init
#   terraform apply
#
# Never re-run this as part of CD, and never delete the bucket/table it
# creates while the main config still depends on them.

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "tf_state" {
  bucket = var.state_bucket_name

  # The state file is the only copy of "what Terraform thinks exists" —
  # losing it makes every future apply a guess. Versioning + no force-destroy
  # means a bad `apply` or an accidental delete is always recoverable.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket                  = aws_s3_bucket.tf_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Concurrent-apply locking uses S3's own native locking (`use_lockfile` in
# backend.tf) — a conditional write on a lockfile object in this same
# bucket — so there's no separate DynamoDB table to create or pay for.
