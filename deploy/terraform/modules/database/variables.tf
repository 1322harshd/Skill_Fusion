variable "name_prefix" {
  type = string
}

variable "db_subnet_ids" {
  type = list(string)
}

variable "db_security_group_id" {
  type = string
}

variable "db_name" {
  type    = string
  default = "skillfusion"
}

variable "db_username" {
  type    = string
  default = "skillfusion_app"
}

variable "instance_class" {
  description = "db.t4g.micro is the cheapest ARM-based class that still supports pgvector/HNSW comfortably for a small app."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage_gb" {
  type    = number
  default = 20
}

variable "deletion_protection" {
  type    = bool
  default = false
}
