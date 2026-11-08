output "smtp_secret_arn" {
  value = aws_secretsmanager_secret.ses_smtp.arn
}

output "smtp_endpoint" {
  value = "email-smtp.${var.aws_region}.amazonaws.com"
}

output "domain_verification_record" {
  description = "Add as a TXT record: name `_amazonses.<domain>`, value below."
  value       = aws_ses_domain_identity.main.verification_token
}

output "dkim_cname_records" {
  description = "Add each token as a CNAME: name `<token>._domainkey.<domain>`, value `<token>.dkim.amazonses.com`."
  value       = aws_ses_domain_dkim.main.dkim_tokens
}

output "route53_name_servers" {
  description = "Set these as the domain's nameservers at GoDaddy (Domain Settings -> Nameservers -> Custom) to put DNS under Route53's control."
  value       = aws_route53_zone.main.name_servers
}

output "route53_zone_id" {
  value = aws_route53_zone.main.zone_id
}

output "cloudfront_cert_arn" {
  description = "Validated us-east-1 ACM cert covering <domain>, www.<domain>, and api.<domain> — for CloudFront's viewer_certificate."
  value       = aws_acm_certificate_validation.cloudfront.certificate_arn
}
