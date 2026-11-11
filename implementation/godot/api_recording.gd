extends RefCounted
## Development scene-tape reader only. Does not validate/reduce producer input.
const Presence = preload("res://presence.gd")
var validation_error := ""
var metadata: Dictionary = {}
var current: Dictionary = {}
var _file: FileAccess
var _next: Dictionary = {}
var _count := 0
var _last_at := -1.0
var _playback_at := -1.0
var _body_start := 0

func _fail(reason: String) -> bool:
	validation_error = reason
	current = {}
	_next = {}
	return false

func _number(value: Variant, minimum: float = 0.0) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and float(value) >= minimum

func valid_scene(value: Variant) -> bool:
	if not value is Dictionary:
		return false
	if value.get("version") != 1 or not _number(value.get("aspect"),0.001) or not Presence.STATES.has(value.get("state")) or not _number(value.get("time")):
		return false
	if not is_equal_approx(float(value.aspect),360.0/460.0):
		return false
	if not value.get("glows") is Array or value.glows.size() != 9 or not value.get("lights") is Array or value.lights.size() != 1170:
		return false
	for collection: String in ["glows","lights"]:
		for item: Variant in value[collection]:
			if not item is Dictionary or not _number(item.get("opacity")) or item.opacity > 1.0:
				return false
			for coordinate: String in ["x","y"]:
				if not (item.get(coordinate) is int or item.get(coordinate) is float) or not is_finite(float(item[coordinate])):
					return false
			if not item.get("color") is Array or item.color.size() != 3:
				return false
			for channel: Variant in item.color:
				if not _number(channel) or channel > 255:
					return false
			if collection == "glows":
				if not _number(item.get("rx"),0.000001) or not _number(item.get("ry"),0.000001):
					return false
			elif not _number(item.get("radius"),0.000001) or not item.get("halo") is bool:
				return false
	return true

func open_recording(sample_fixture: bool = false) -> bool:
	validation_error = ""
	current = {}
	_next = {}
	var base := ProjectSettings.globalize_path("res://../test-artifacts/").simplify_path()
	var filename := "api-overlay-sample.jsonl" if sample_fixture else "api-overlay-recording.jsonl"
	var directory := DirAccess.open(base)
	if directory == null or directory.is_link(filename):
		return _fail("Recording directory missing or symlink target refused")
	_file = FileAccess.open(base.path_join(filename),FileAccess.READ)
	if _file == null:
		return _fail("Generate the synthetic API recording before selecting this mode")
	var header: Variant = JSON.parse_string(_file.get_line())
	if not header is Dictionary or header.get("kind") != "briar-synthetic-scene-tape" or header.get("version") != 1 or header.get("syntheticOnly") != true:
		return _fail("Not a supported synthetic scene tape")
	if not _number(header.get("durationMs"),1) or not _number(header.get("frameCount"),1) or fmod(float(header.frameCount),1.0) != 0:
		return _fail("Invalid scene-tape duration or frame count")
	metadata = header
	_body_start = _file.get_position()
	_playback_at = -1.0
	return _rewind()

func _rewind() -> bool:
	_file.seek(_body_start)
	_count = 0
	_last_at = -1.0
	current = {}
	_next = {}
	return _read_next()

func _read_next() -> bool:
	var line := _file.get_line()
	if line.is_empty() and _file.eof_reached():
		_next = {}
		return true if _count == int(metadata.frameCount) else _fail("Truncated scene tape")
	var record: Variant = JSON.parse_string(line)
	if not record is Dictionary or not _number(record.get("at")) or float(record.at) <= _last_at or float(record.at) >= float(metadata.durationMs):
		return _fail("Invalid or unordered scene-tape frame")
	if not valid_scene(record.get("scene")) or not valid_scene(record.get("reducedScene")) or not record.get("semantic") is Dictionary or record.semantic.get("mode") != "synthetic":
		return _fail("Invalid synthetic scene or semantic record")
	if not ["unknown","working","waiting","quiet"].has(record.semantic.get("baseState")):
		return _fail("Invalid accepted base state")
	if record.semantic.baseState == "unknown" and (record.scene.state != "unknown" or record.reducedScene.state != "unknown"):
		return _fail("Unknown source cannot display a known-state scene")
	_count += 1
	if _count > int(metadata.frameCount):
		return _fail("Unexpected extra scene-tape frame")
	_last_at = float(record.at)
	_next = record
	return true

func sample(seconds: float, reduced_motion: bool) -> Dictionary:
	if not validation_error.is_empty() or _file == null:
		return {}
	if not is_finite(seconds) or seconds < 0:
		_fail("Explicit nonnegative playback time required")
		return {}
	var at := fmod(seconds*1000.0,float(metadata.durationMs))
	if at < _playback_at and not _rewind():
		return {}
	_playback_at = at
	while not _next.is_empty() and (_next.at <= at or current.is_empty()):
		current = _next
		if not _read_next():
			return {}
	return current.get("reducedScene" if reduced_motion else "scene",{})
