from pydantic import BaseModel, Field
from typing import List
class BriefSchema(BaseModel):
    lede: str = Field(min_length=20)
    complementarity: List[str] = Field(min_length=2, max_length=2)
    applications: List[str] = Field(min_length=3, max_length=3)
    industries: List[str] = Field(min_length=3, max_length=3)
    insights: List[str] = Field(min_length=2, max_length=2)
