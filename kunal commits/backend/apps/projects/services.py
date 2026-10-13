import asyncio
try:
    from apps.prompt_engineering.llm_client import call_sf14b_json
except ImportError:
    from prompt_engineering.llm_client import call_sf14b_json

BRIEF_SHAPE = ('{"title": string, "fusion_pair": [string, string], '
    '"key_deliverables": [string, string, string], "expected_outcome": string}')

def make_project(a, b):
    prompt = (f'Propose one flagship project brief combining "{a}" and "{b}". '
              f'Return ONLY valid JSON: {BRIEF_SHAPE}')
    return asyncio.run(call_sf14b_json("sf-project", prompt))
