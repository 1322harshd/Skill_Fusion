from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [("scores", "0001_initial")]
    operations = [
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS joblisting_embedding_hnsw "
            "ON scores_joblisting USING hnsw (embedding vector_cosine_ops);",
            reverse_sql="DROP INDEX IF EXISTS joblisting_embedding_hnsw;",
        )
    ]
