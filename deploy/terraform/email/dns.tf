# Despite the directory's name, this stack now holds everything about
# skillfusion.shop's identity that shouldn't get destroyed on an app
# redeploy cycle: SES (main.tf) and the domain's DNS itself. Kept as one
# state on purpose, same reasoning as backend.tf explains for SES.
#
# Deliberately just the zone for now — no ACM cert here yet. Adding the
# cert (and its aws_acm_certificate_validation) in the same apply as the
# zone would make `terraform apply` hang waiting for DNS validation that
# can't succeed until GoDaddy's nameservers actually point here. That
# comes in a follow-up change once the nameserver switch has propagated.
resource "aws_route53_zone" "main" {
  name = var.domain_name
}

# Without these, mail from a brand-new domain gets silently dropped or
# junked by stricter providers (Outlook/Hotmail especially) even though
# SES itself accepts and sends it without error.
resource "aws_route53_record" "spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:amazonses.com ~all"]
}

resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 300
  records = ["v=DMARC1; p=quarantine;"]
}

# One cert, three names — CloudFront needs the cert attached to a
# distribution to cover every alias that distribution answers for, and the
# frontend answers for both the apex and www.
resource "aws_acm_certificate" "cloudfront" {
  provider                  = aws.us_east_1
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}", "api.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Route53 now being authoritative for the domain means validation can be
# fully automatic — no manual DNS step like the SES records needed.
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id         = aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "cloudfront" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}
