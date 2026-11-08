terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    external = {
      source  = "hashicorp/external"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# CloudFront only accepts ACM certs issued in us-east-1, regardless of
# which region everything else runs in.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
