data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

resource "aws_ecr_repository" "backend" {
  name                 = "${var.name_prefix}-backend"
  image_tag_mutability = "MUTABLE"
  # Same reasoning as the frontend bucket's force_destroy — a `terraform
  # destroy` shouldn't be blocked by whatever images happen to be pushed.
  force_delete = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecs_cluster" "main" {
  name = "${var.name_prefix}-cluster"
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.name_prefix}-backend"
  retention_in_days = 14
}

# Django's own SECRET_KEY (signing, sessions) — separate from the DB secret
# since it has nothing to do with the database and rotates independently.
resource "random_password" "django_secret_key" {
  length  = 50
  special = true
}

resource "aws_secretsmanager_secret" "django" {
  name = "${var.name_prefix}-django-secret-key"

  # Same reasoning as force_destroy on the frontend bucket — the default
  # 30-day recovery window would block an immediate re-apply after a
  # destroy with "already scheduled for deletion".
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "django" {
  secret_id     = aws_secretsmanager_secret.django.id
  secret_string = random_password.django_secret_key.result
}

# Deliberately no aws_secretsmanager_secret_version here — the Tailscale
# auth key comes from a friend's tailnet, not anything Terraform can
# generate, so its value is set out of band via `aws secretsmanager
# put-secret-value` and never touches this config or git.
resource "aws_secretsmanager_secret" "tailscale" {
  name                    = "${var.name_prefix}-tailscale-authkey"
  recovery_window_in_days = 0
}

# Same reasoning as the Tailscale key above — set out of band, never in
# Terraform or git.
resource "aws_secretsmanager_secret" "github_oauth" {
  name                    = "${var.name_prefix}-github-oauth-client-secret"
  recovery_window_in_days = 0
}

# ---- IAM ----

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# The execution role is what ECS itself uses to start the task: pull the
# image from ECR, write logs, and fetch the secrets referenced below. It is
# NOT the app's own runtime identity — that's aws_iam_role.ecs_task.
resource "aws_iam_role" "ecs_execution" {
  name               = "${var.name_prefix}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.db_secret_arn, aws_secretsmanager_secret.django.arn, var.email_secret_arn, aws_secretsmanager_secret.tailscale.arn, aws_secretsmanager_secret.github_oauth.arn]
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "${var.name_prefix}-ecs-execution-secrets"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets.json
}

# The app's own runtime role — empty for now (Django doesn't call any AWS
# APIs itself yet). Kept separate from the execution role on purpose, so
# adding real permissions later (e.g. S3 for user uploads) doesn't also
# widen ECS's own image-pull/secrets-read access.
resource "aws_iam_role" "ecs_task" {
  name               = "${var.name_prefix}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

# ---- Task definition ----

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.name_prefix}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.backend_image
      essential = true
      portMappings = [
        { containerPort = var.app_port, protocol = "tcp" }
      ]
      # Waits for the sidecar to actually be on the tailnet before Django
      # starts — otherwise the first AI request after a deploy could race
      # tailscaled still connecting and fail for a reason that has nothing
      # to do with the request itself.
      dependsOn = [
        { containerName = "tailscale", condition = "HEALTHY" }
      ]
      environment = [
        { name = "DEBUG", value = "False" },
        # No custom domain yet — CloudFront passes the ALB's own DNS name as
        # Host, so this has to stay permissive for now. Tighten this to the
        # real domain(s) once one exists.
        { name = "ALLOWED_HOSTS", value = "*" },
        { name = "CORS_ALLOWED_ORIGINS", value = var.cors_allowed_origins },
        { name = "FRONTEND_URL", value = var.frontend_url },
        { name = "EMAIL_BACKEND", value = "django.core.mail.backends.smtp.EmailBackend" },
        { name = "EMAIL_HOST", value = var.email_smtp_endpoint },
        { name = "EMAIL_PORT", value = "587" },
        { name = "EMAIL_USE_TLS", value = "True" },
        { name = "DEFAULT_FROM_EMAIL", value = var.email_from_address },
        { name = "LLM_API_URL", value = var.llm_api_url },
        # Containers in the same Fargate task share one network namespace,
        # so this reaches the tailscale container's own loopback-bound
        # proxy directly — no service discovery needed.
        { name = "TAILSCALE_PROXY_URL", value = "http://localhost:1055" },
        # Not secret — GithubOAuthConfigView already hands this to the
        # frontend on request, so there's nothing gained by hiding it here.
        { name = "GITHUB_OAUTH_CLIENT_ID", value = var.github_oauth_client_id },
      ]
      secrets = [
        { name = "SECRET_KEY", valueFrom = aws_secretsmanager_secret.django.arn },
        { name = "DB_HOST", valueFrom = "${var.db_secret_arn}:DB_HOST::" },
        { name = "DB_PORT", valueFrom = "${var.db_secret_arn}:DB_PORT::" },
        { name = "DB_NAME", valueFrom = "${var.db_secret_arn}:DB_NAME::" },
        { name = "DB_USER", valueFrom = "${var.db_secret_arn}:DB_USER::" },
        { name = "DB_PASSWORD", valueFrom = "${var.db_secret_arn}:DB_PASSWORD::" },
        { name = "EMAIL_HOST_USER", valueFrom = "${var.email_secret_arn}:USER::" },
        { name = "EMAIL_HOST_PASSWORD", valueFrom = "${var.email_secret_arn}:PASSWORD::" },
        { name = "GITHUB_OAUTH_CLIENT_SECRET", valueFrom = aws_secretsmanager_secret.github_oauth.arn },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "backend"
        }
      }
    },
    {
      # Fargate has no TUN device / privileged mode, so this runs in
      # userspace networking and exposes an HTTP proxy on localhost
      # instead of a real network interface — see llm_client.py's
      # SF_PROXIES for the one call that's routed through it.
      name      = "tailscale"
      image     = "tailscale/tailscale:latest"
      essential = true
      environment = [
        { name = "TS_USERSPACE", value = "true" },
        { name = "TS_OUTBOUND_HTTP_PROXY_LISTEN", value = "localhost:1055" },
        { name = "TS_STATE_DIR", value = "/var/lib/tailscale" },
        { name = "TS_HOSTNAME", value = "${var.name_prefix}-backend" },
      ]
      secrets = [
        { name = "TS_AUTHKEY", valueFrom = aws_secretsmanager_secret.tailscale.arn },
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "tailscale status >/dev/null 2>&1 || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 15
      }
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "tailscale"
        }
      }
    }
  ])
}

# ---- Load balancer ----
# HTTP only — CloudFront in front of this (see cloudfront.tf) is the HTTPS
# front door, since ACM can't issue a cert for the ALB's own *.elb.amazonaws.com
# name without a custom domain.

resource "aws_lb" "backend" {
  name               = "${var.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_target_group" "backend" {
  name        = "${var.name_prefix}-tg"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip" # required for awsvpc-mode Fargate tasks

  health_check {
    path                = "/admin/login/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.backend.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

resource "aws_ecs_service" "backend" {
  name            = "${var.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  # Don't block `terraform apply` on the service reaching a healthy steady
  # state — matters on the very first apply, where the task definition still
  # points at a bootstrap placeholder image that was never going to pass the
  # health check. The CD pipeline verifies real deploys with its own
  # `aws ecs wait services-stable` step instead, which has its own timeout.
  wait_for_steady_state = false

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [var.backend_security_group_id]
    assign_public_ip = true # no NAT Gateway — tasks need this to reach ECR/Secrets Manager
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = var.app_port
  }

  # The listener must exist before ECS tries to register targets against it.
  depends_on = [aws_lb_listener.http]
}
