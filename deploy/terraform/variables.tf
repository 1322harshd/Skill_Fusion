variable "aws_region" {
  type    = string
  default = "ap-southeast-2"
}

variable "name_prefix" {
  type    = string
  default = "skillfusion"
}

variable "frontend_bucket_name" {
  description = "Must be globally unique across all of AWS — defaults to a name suffixed with this account's id to guarantee that."
  type        = string
  default     = "skillfusion-frontend-013364996908"
}

variable "domain_name" {
  description = "Domain SES sends email from and (later) the custom domain for the frontend/API. DNS for it lives at the registrar, not in this Terraform config."
  type        = string
  default     = "skillfusion.shop"
}

variable "backend_image" {
  description = "Full ECR image URI including tag. The CD pipeline passes this on every deploy; locally it defaults to a placeholder so `terraform plan` doesn't fail before the first image exists."
  type        = string
  default     = "public.ecr.aws/docker/library/nginx:latest"
}

variable "llm_api_url" {
  description = "The AI model's Tailscale address — a friend's laptop, reached through the Tailscale sidecar's proxy."
  type        = string
  default     = "http://100.95.8.56:8081"
}

variable "github_oauth_client_id" {
  description = "From a GitHub OAuth App (github.com/settings/developers) — not secret."
  type        = string
  default     = "Ov23ctb4jiZMilR0AOJC"
}
