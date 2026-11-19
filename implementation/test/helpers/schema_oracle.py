"""Offline test-only JSON Schema oracle; not an application input service."""
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[3]
SCHEMA = json.loads((ROOT / "design/api/0.1-draft/schema.json").read_text())
Draft202012Validator.check_schema(SCHEMA)
CHECKER = FormatChecker()


@CHECKER.checks("date-time", raises=(ValueError, TypeError))
def draft_datetime(value):
    if not isinstance(value, str):
        return True
    if re.fullmatch(SCHEMA["$defs"]["timestamp"]["pattern"], value) is None:
        return False
    parsed = datetime.fromisoformat(value.replace("t", "T").replace("z", "Z").replace("Z", "+00:00"))
    return parsed.tzinfo is not None


def reject_nonfinite(value):
    raise ValueError("Non-JSON numeric constant")


message = json.load(sys.stdin, parse_constant=reject_nonfinite)
validator = Draft202012Validator(SCHEMA, format_checker=CHECKER)
print(json.dumps({"valid": validator.is_valid(message)}))
