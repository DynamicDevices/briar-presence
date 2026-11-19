extends SceneTree

const Presence = preload("res://presence.gd")
# Scene-coordinate tolerance, below 0.00005 px at the 360x460 reference size.
const TOLERANCE := 0.0000001
var failures: PackedStringArray = []
var failure_count := 0
var maximum_error := 0.0
var maximum_error_path := ""
var compared_numbers := 0

func fail(message: String) -> void:
	failure_count += 1
	if failures.size() < 5:
		failures.append(message)

func compare(actual: Variant, expected: Variant, location: String) -> void:
	if expected is Dictionary:
		if not actual is Dictionary or actual.size() != expected.size():
			fail(location+": dictionary shape")
			return
		for key: String in expected:
			if not actual.has(key):
				fail(location+": missing "+key)
			else:
				compare(actual[key],expected[key],location+"."+key)
	elif expected is Array:
		if not actual is Array or actual.size() != expected.size():
			fail(location+": array shape")
			return
		for i in range(expected.size()):
			compare(actual[i],expected[i],location+"["+str(i)+"]")
	elif expected is float or expected is int:
		if not (actual is float or actual is int) or not is_finite(float(actual)):
			fail(location+": numeric type")
			return
		compared_numbers += 1
		var error := absf(float(actual)-float(expected))
		if error > maximum_error:
			maximum_error = error
			maximum_error_path = location
		if error > (0.0 if location.contains(".color[") or location.ends_with(".version") else TOLERANCE):
			fail(location+": numeric difference "+str(error))
	elif actual != expected:
		fail(location+": value difference")

func project_file(relative: String) -> String:
	return ProjectSettings.globalize_path("res://").path_join(relative).simplify_path()

func _initialize() -> void:
	var fixtures: Variant = JSON.parse_string(FileAccess.get_file_as_string(project_file("../test-artifacts/reference-scenes-v1.json")))
	if not fixtures is Dictionary or fixtures.get("format") != "briar-presence-reference-scenes/1" or fixtures.get("referenceCoreSha256") != FileAccess.get_sha256(project_file("../core/presence.mjs")):
		push_error("Missing, invalid or stale reference scenes")
		quit(1)
		return
	var samples := 0
	for entry: Dictionary in fixtures["cases"]:
		var model := Presence.new(int(entry["seed"]))
		for pair: Dictionary in entry["samples"]:
			compare(model.sample(pair["input"]),pair["scene"],entry["id"]+"/"+str(samples))
			samples += 1
	var result := {"type":"godot-behaviour-conformance","passed":failure_count == 0,"engine":Engine.get_version_info()["string"],"samples":samples,"comparedNumbers":compared_numbers,"maximumNumericError":maximum_error,"maximumErrorPath":maximum_error_path,"tolerance":TOLERANCE,"failureCount":failure_count,"firstFailures":Array(failures),"referenceCoreSha256":fixtures["referenceCoreSha256"],"portSha256":FileAccess.get_sha256(project_file("presence.gd")),"scope":"Shared scene fixtures only; no renderer or desktop-window acceptance."}
	var output := FileAccess.open(project_file("../test-artifacts/godot-conformance.json"),FileAccess.WRITE)
	if output == null:
		push_error("Cannot write conformance report")
		quit(1)
		return
	output.store_string(JSON.stringify(result,"\t")+"\n")
	output.close()
	print(JSON.stringify(result))
	quit(0 if failure_count == 0 else 1)
