variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "backend_security_group_id" {
  type = string
}

variable "db_secret_arn" {
  type = string
}

variable "app_port" {
  type    = number
  default = 8000
}

variable "task_cpu" {
  description = "256 = 0.25 vCPU, the smallest valid Fargate size."
  type        = string
  default     = "256"
}

variable "task_memory" {
  description = "512MB, the smallest size Fargate allows paired with 256 CPU units."
  type        = string
  default     = "512"
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "backend_image" {
  description = "Full ECR image URI including tag, e.g. <account>.dkr.ecr.<region>.amazonaws.com/<repo>:<tag>. Supplied by the CD pipeline on each deploy."
  type        = string
}

variable "cors_allowed_origins" {
  description = "Comma-separated list of origins allowed to make credentialed requests (Django's Csv() cast splits this)."
  type        = string
}

variable "frontend_url" {
  description = "Canonical frontend URL used to build links in emails."
  type        = string
}

variable "custom_domain_aliases" {
  description = "Extra hostnames the CloudFront distribution should answer for, e.g. api.skillfusion.shop. Empty until the ACM cert backing acm_certificate_arn is validated."
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "us-east-1 ACM cert ARN. Empty string until custom_domain_aliases is non-empty."
  type        = string
  default     = ""
}

variable "email_secret_arn" {
  description = "Secrets Manager ARN holding the SES SMTP USER/PASSWORD, from the email module."
  type        = string
}

variable "email_smtp_endpoint" {
  description = "Region-specific SES SMTP endpoint, e.g. email-smtp.ap-southeast-2.amazonaws.com."
  type        = string
}

variable "email_from_address" {
  description = "Value for DEFAULT_FROM_EMAIL — must be on the SES-verified domain."
  type        = string
}
