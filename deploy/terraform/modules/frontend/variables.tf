variable "name_prefix" {
  type = string
}

variable "bucket_name" {
  description = "Must be globally unique across all of AWS."
  type        = string
}
