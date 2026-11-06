output "frontend_url" {
  value = module.frontend.site_url
}

output "backend_api_url" {
  value = module.backend_service.api_url
}

output "ecr_repository_url" {
  value = module.backend_service.ecr_repository_url
}

output "ecs_cluster_name" {
  value = module.backend_service.ecs_cluster_name
}

output "ecs_service_name" {
  value = module.backend_service.ecs_service_name
}

output "frontend_bucket_name" {
  value = module.frontend.bucket_name
}

output "frontend_distribution_id" {
  value = module.frontend.distribution_id
}
