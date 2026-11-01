"""Re-fusion (the "Add third skill -> graduate to the trio" flow): the new
Fusion row carries its added_skills and the lineage back to the pair it
evolved from. The old pair row is never touched."""
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("fusion_engine", "0003_alter_quizsession_options_quizsession_user"),
    ]

    operations = [
        migrations.AddField(
            model_name="fusion",
            name="lineage_from",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
