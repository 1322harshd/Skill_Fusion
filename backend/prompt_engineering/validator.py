import json, re
def parse_with_retry(text, schema, retries=2):
    for i in range(retries+1):
        try:
            t=text.replace("```json","").replace("```","").strip()
            t=re.sub(r",\s*([}\]])", r"\1", t)
            obj=json.loads(t)
            return schema.model_validate(obj).model_dump()
        except Exception as e:
            if i==retries: raise
            m=re.search(r"\{[\s\S]*\}", text)
            if m: text=m.group(0)
