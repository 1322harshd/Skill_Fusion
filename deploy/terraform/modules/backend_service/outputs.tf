output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.backend.name
}

output "api_url" {
  description = "HTTPS URL for the backend API (via CloudFront)."
  value       = "https://${aws_cloudfront_distribution.backend.domain_name}"
}

output "alb_dns_name" {
  value = aws_lb.backend.dns_name
}
