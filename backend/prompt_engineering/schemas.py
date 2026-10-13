from pydantic import BaseModel, Field
from typing import List
class BriefSchema(BaseModel):
    lede: str
    complementarity: List[str]
    applications: List[str]
    industries: List[str]
    insights: List[str]
class ProjectSchema(BaseModel):
    title: str
    client: str
    timeline: str
    format: str
    audience: str
    goal: str
    tools: List[str]
    deliverables: List[str]
    expectedOutcome: str
class ExplainSchema(BaseModel):
    clarity: str
    note: str
    suggestion: str
