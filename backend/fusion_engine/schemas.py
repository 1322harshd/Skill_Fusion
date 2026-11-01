from pydantic import BaseModel, Field, field_validator
from typing import List, Literal


class OracleLineSchema(BaseModel):
    voice: Literal["skeptic", "oracle"]
    line: str = Field(min_length=8, max_length=400)

    @field_validator("voice", mode="before")
    @classmethod
    def _normalize_voice(cls, v):
        # SF can shout ("SKEPTIC") or drift ("the skeptic") — map anything
        # skeptic-ish to skeptic so one stray string can't void the whole call.
        s = str(v or "").strip().lower()
        return "skeptic" if "skeptic" in s or "sceptic" in s else "oracle"


class OracleVerdictSchema(BaseModel):
    stars: int = Field(ge=1, le=5)
    headline: str = Field(min_length=4, max_length=140)
    question: str = Field(min_length=12, max_length=300)

    @field_validator("stars", mode="before")
    @classmethod
    def _clamp_stars(cls, v):
        # Model occasionally reaches for 6/10 or "4/5" — clamp, never reject.
        try:
            v = int(str(v).split("/")[0].strip())
        except Exception:
            return 3
        return max(1, min(5, v))


class OracleSchema(BaseModel):
    debate: List[OracleLineSchema] = Field(min_length=4, max_length=6)
    verdict: OracleVerdictSchema


class BriefSchema(BaseModel):
    lede: str = Field(min_length=20)
    complementarity: List[str] = Field(min_length=2, max_length=2)
    applications: List[str] = Field(min_length=3, max_length=3)
    industries: List[str] = Field(min_length=3, max_length=3)
    insights: List[str] = Field(min_length=2, max_length=2)
