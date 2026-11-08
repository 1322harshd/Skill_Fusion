variable "domain_name" {
  description = "The domain SES will send from, e.g. skillfusion.shop. Verified via DNS records you add by hand (see outputs) since DNS isn't managed by this Terraform config."
  type        = string
  default     = "skillfusion.shop"
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-2"
}

variable "name_prefix" {
  type    = string
  default = "skillfusion"
}
