variable "aws_region" {
  type    = string
  default = "ap-southeast-2"
}

variable "state_bucket_name" {
  description = "Must be globally unique across all of AWS — defaults to a name suffixed with this account's id to guarantee that."
  type        = string
  default     = "skillfusion-terraform-state-013364996908"
}
