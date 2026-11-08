# CloudFront in front of the ALB purely for free HTTPS (ACM can't issue a
# cert for *.elb.amazonaws.com without a custom domain). CloudFront
# terminates TLS for clients; the hop from CloudFront to the ALB stays
# plain HTTP, which is fine since that leg never leaves AWS's own network.

resource "aws_cloudfront_distribution" "backend" {
  enabled = true
  comment = "${var.name_prefix} backend API"

  origin {
    domain_name = aws_lb.backend.dns_name
    origin_id   = "backend-alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "backend-alb"
    viewer_protocol_policy = "redirect-to-https"

    # This is a dynamic API, not static content — don't cache responses,
    # and forward everything (cookies, auth headers, query strings) through
    # untouched. Both are AWS managed policies, not custom-defined here.
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3" # Managed-AllViewer
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  aliases = var.custom_domain_aliases

  # Falls back to the default *.cloudfront.net cert when no custom domain
  # is wired up yet — CloudFront rejects an empty acm_certificate_arn, so
  # this can't just always reference it.
  dynamic "viewer_certificate" {
    for_each = var.acm_certificate_arn == "" ? [1] : []
    content {
      cloudfront_default_certificate = true
    }
  }

  dynamic "viewer_certificate" {
    for_each = var.acm_certificate_arn == "" ? [] : [1]
    content {
      acm_certificate_arn      = var.acm_certificate_arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }
}
