# Single-AZ RDS Postgres — cheap-tier choice. PostgreSQL 16 supports the
# pgvector extension natively (needed by the `scores` app's embedding/HNSW
# index); the extension itself is still created by Django's own migration
# (scores/migrations/0001_initial.py), this just has to be a PG version that
# allows it.

resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db-subnets"
  subnet_ids = var.db_subnet_ids
  tags       = { Name = "${var.name_prefix}-db-subnets" }
}

resource "random_password" "db" {
  length  = 32
  special = false # avoid characters that need extra escaping in connection strings/URLs
}

resource "aws_db_instance" "main" {
  identifier     = "${var.name_prefix}-db"
  engine         = "postgres"
  engine_version = "16"

  instance_class         = var.instance_class
  allocated_storage      = var.allocated_storage_gb
  storage_type           = "gp3"
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.db_security_group_id]

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  multi_az            = false # cheap tier — flip to true for real HA later
  publicly_accessible = false
  storage_encrypted   = true

  # Cheap-tier tradeoff: a short, un-final-snapshotted backup window keeps
  # cost down but means recovery is limited to the retention window below,
  # not an exact point just before a mistake.
  backup_retention_period = 3
  skip_final_snapshot     = true
  deletion_protection     = var.deletion_protection

  tags = { Name = "${var.name_prefix}-db" }
}

resource "aws_secretsmanager_secret" "db" {
  name = "${var.name_prefix}-db-credentials"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    DB_HOST     = aws_db_instance.main.address
    DB_PORT     = tostring(aws_db_instance.main.port)
    DB_NAME     = var.db_name
    DB_USER     = var.db_username
    DB_PASSWORD = random_password.db.result
  })
}
