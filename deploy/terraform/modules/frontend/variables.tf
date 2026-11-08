variable "name_prefix" {
  type = string
}

variable "bucket_name" {
  description = "Must be globally unique across all of AWS."
  type        = string
}

variable "custom_domain_aliases" {
  description = "Extra hostnames the CloudFront distribution should answer for, e.g. the apex + www. Empty until the ACM cert backing acm_certificate_arn is validated."
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "us-east-1 ACM cert ARN. Empty string until custom_domain_aliases is non-empty."
  type        = string
  default     = ""
}
