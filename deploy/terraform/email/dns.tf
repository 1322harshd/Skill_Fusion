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
