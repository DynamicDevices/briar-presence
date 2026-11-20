"""Finite synthetic-host complete schema oracle, not a production service."""
import json
import sys
from datetime import datetime
from jsonschema import Draft202012Validator, FormatChecker

def reject_constant(value):
    raise ValueError("Non-JSON numeric constant")

request = json.load(sys.stdin, parse_constant=reject_constant)
schema = request["schema"]  # Supplied by trusted test host, never wire data.
Draft202012Validator.check_schema(schema)
checker = FormatChecker()

@checker.checks("date-time", raises=(ValueError, TypeError))
def timestamp(value):
    if not isinstance(value, str):
        return True
    parsed = datetime.fromisoformat(value.replace("t", "T").replace("z", "Z").replace("Z", "+00:00"))
    return parsed.tzinfo is not None

validator = Draft202012Validator(schema, format_checker=checker)
print(json.dumps({"valid": validator.is_valid(request["message"])}))
