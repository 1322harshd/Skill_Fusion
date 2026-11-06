# Deploying to AWS

Architecture: S3 + CloudFront for the static frontend, ECS Fargate + ALB
(fronted by a second CloudFront distribution, for free HTTPS) for the Django
backend, RDS PostgreSQL for the database. Everything is defined in
`terraform/`; `.github/workflows/cd-pipeline.yml` deploys automatically on
every push to `shared`.

This is the **cheap/simple tier**: single-AZ RDS, no NAT Gateway (Fargate
tasks sit in public subnets with a locked-down security group instead), one
backend task, no custom domain. See the comments in `terraform/modules/*`
for what to change for a more production-grade setup (Multi-AZ RDS, more
tasks + autoscaling, a NAT Gateway if you need the backend in truly private
subnets, a real domain + ACM cert).

## One-time setup

1. **Bootstrap the Terraform state backend** (creates the S3 bucket
   Terraform itself uses to store state — this can't live in the same
   state it's storing, so it's a separate tiny config). Locking against
   concurrent applies uses S3's own native locking, so there's no separate
   lock table to create:

   ```
   cd deploy/terraform/bootstrap
   terraform init
   terraform apply
   ```

   If you change `state_bucket_name` from the default, update
   `deploy/terraform/backend.tf` to match — Terraform backend blocks can't
   use variables, so that value has to be typed in both places by hand.

2. **Add GitHub Actions secrets** (repo Settings → Secrets and variables →
   Actions):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

   These need permission to create/manage VPC, ECS, ALB, RDS, S3,
   CloudFront, IAM roles, Secrets Manager and ECR resources. For now the
   simplest option is a dedicated IAM user with `AdministratorAccess` — fine
   for a personal/demo project, but replace it with a scoped-down policy
   before this account holds anything you actually care about protecting.

3. **First deploy**: push to `shared`, or run the workflow by hand from the
   Actions tab (`workflow_dispatch`). The pipeline creates the ECR repo
   first (nothing to push an image to otherwise), then builds and pushes
   the backend image, then `terraform apply`s everything else, then syncs
   the frontend to S3.

## Running Terraform by hand

```
cd deploy/terraform
terraform init
terraform plan                                    # see what would change
terraform apply -var="backend_image=<ecr-uri>:<tag>"
```

`backend_image` defaults to a public placeholder image so `plan`/`apply`
don't hard-fail before any real image has ever been pushed — always pass a
real one explicitly when applying by hand.

## What's NOT handled yet

- **No custom domain.** Both the frontend and backend get free HTTPS via
  CloudFront's default `*.cloudfront.net` certificate. Add a domain +
  Route53 + ACM cert later and point both distributions at it.
- **Migrations run inside the container's own startup command**
  (`CMD` in `backend/Dockerfile`), which is fine with one task
  (`desired_count = 1`) but would race if you ever scale the service up —
  move migrations to a separate one-off ECS task run before rolling out a
  new image if you do.
- **`LLM_API_URL` / `EMBED_URL`** still default to `localhost` — resume
  generation, fusion scoring, and anything else that calls the
  self-hosted LLM won't work from AWS until that's reachable from the VPC
  too (hosted somewhere with a real URL, or run alongside the backend).
- **GitHub Actions auth uses static AWS keys**, not OIDC — simpler to set
  up, but worth switching to short-lived OIDC credentials once this is
  worth hardening.
