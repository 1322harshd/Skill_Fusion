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

variable "backend_image" {
  description = "Full ECR image URI including tag. The CD pipeline passes this on every deploy; locally it defaults to a placeholder so `terraform plan` doesn't fail before the first image exists."
  type        = string
  default     = "public.ecr.aws/docker/library/nginx:latest"
}
