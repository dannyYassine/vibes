import re

from budget.budget.domain.value_objects import NormalizedTitle

# TODO: sample-driven normalization. Until samples/rbc_descriptions.txt has 30+
# real RBC transactions, this returns identity (raw string lowercased).
#
# Suggested pipeline (validate against real samples before enabling):
#   1. lowercase
#   2. strip store numbers: r"#\d+"
#   3. strip trailing reference codes / dates
#   4. collapse whitespace

_STORE_NUM = re.compile(r"#\d+")
_REF_CODES = re.compile(r"\b[A-Z]{2,}\d{4,}\b")
_MULTI_WS = re.compile(r"\s+")


def normalize(raw: str) -> NormalizedTitle:
    """v1: identity (lowercased raw). Tightened once samples are in."""
    if not raw:
        return NormalizedTitle("")
    value = raw.strip().lower()
    return NormalizedTitle(value)


def normalize_strict(raw: str) -> NormalizedTitle:
    """ENABLE ONLY after validating against samples."""
    s = raw.lower()
    s = _STORE_NUM.sub("", s)
    s = _REF_CODES.sub("", s)
    s = _MULTI_WS.sub(" ", s).strip()
    return NormalizedTitle(s)