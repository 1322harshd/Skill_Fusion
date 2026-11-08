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
