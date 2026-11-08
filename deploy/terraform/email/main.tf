# SES domain identity + DKIM signing. Verification is DNS-based — since the
# domain's DNS lives at GoDaddy (not Route53), Terraform can't create those
# records itself. Add them by hand from this stack's outputs, then SES
# flips the identity to "verified" on its own once it sees them (no
# re-apply needed).
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# SES has no API that hands back ready-to-use SMTP credentials directly —
# the console's "Create SMTP credentials" button is really just an IAM
# access key run through a fixed SigV4-derived conversion (smtp_password.py
# below does the same conversion) to get the actual SMTP password.
resource "aws_iam_user" "ses_smtp" {
  name = "${var.name_prefix}-ses-smtp"
}

data "aws_iam_policy_document" "ses_send" {
  statement {
    actions   = ["ses:SendRawEmail", "ses:SendEmail"]
    resources = [aws_ses_domain_identity.main.arn]
  }
}

resource "aws_iam_user_policy" "ses_smtp" {
  name   = "${var.name_prefix}-ses-send"
  user   = aws_iam_user.ses_smtp.name
  policy = data.aws_iam_policy_document.ses_send.json
}

resource "aws_iam_access_key" "ses_smtp" {
  user = aws_iam_user.ses_smtp.name
}

data "external" "smtp_password" {
  program = ["python3", "${path.module}/smtp_password.py"]

  query = {
    secret_access_key = aws_iam_access_key.ses_smtp.secret
    region            = var.aws_region
  }
}

resource "aws_secretsmanager_secret" "ses_smtp" {
  name = "${var.name_prefix}-ses-smtp"
}

resource "aws_secretsmanager_secret_version" "ses_smtp" {
  secret_id = aws_secretsmanager_secret.ses_smtp.id
  secret_string = jsonencode({
    USER     = aws_iam_access_key.ses_smtp.id
    PASSWORD = data.external.smtp_password.result.smtp_password
  })
}
