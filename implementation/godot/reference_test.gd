extends SceneTree

var failures: PackedStringArray = []

func check(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)

func project_file(relative: String) -> String:
	return ProjectSettings.globalize_path("res://").path_join(relative).simplify_path()

func _initialize() -> void:
	var fixture_path := project_file("../test-artifacts/reference-scenes-v1.json")
	var report_path := project_file("../test-artifacts/godot-reference-import.json")
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(fixture_path))
	if not parsed is Dictionary:
		push_error("Reference scenes are missing or invalid JSON")
		quit(1)
		return
	check(parsed.get("format") == "briar-presence-reference-scenes/1", "Fixture format")
	check(parsed.get("sceneVersion") == 1, "Scene version")
	check(parsed.get("referenceCoreSha256") == FileAccess.get_sha256(project_file("../core/presence.mjs")), "Reference core identity")
	var cases: Array = parsed.get("cases", [])
	check(cases.size() == 3, "Three reference cases")
	var sample_count := 0
	var light_count := 0
	var seeds: Array[int] = []
	for entry: Dictionary in cases:
		seeds.append(int(entry["seed"]))
		for sample: Dictionary in entry["samples"]:
			sample_count += 1
			var scene: Dictionary = sample["scene"]
			check(scene["version"] == 1, "Sample version")
			check(is_equal_approx(float(scene["aspect"]), 360.0 / 460.0), "Aspect")
			check(scene["state"] == sample["input"]["state"], "State retained")
			check(scene["lights"].size() == 1170, "Light count")
			check(scene["glows"].size() == 9, "Glow count")
			for light: Dictionary in scene["lights"]:
				light_count += 1
				for field: String in ["x", "y", "radius", "opacity"]:
					check(is_finite(float(light[field])), "Finite " + field)
				check(light["radius"] > 0.0, "Positive radius")
				check(light["opacity"] >= 0.0 and light["opacity"] <= 1.0, "Opacity range")
				var channels: Array = light["color"]
				check(channels.size() == 3, "RGB channels")
				for channel: float in channels:
					check(channel == floor(channel) and channel >= 0.0 and channel <= 255.0, "RGB value")
				var color := Color(channels[0] / 255.0, channels[1] / 255.0, channels[2] / 255.0, light["opacity"])
				var position := Vector2(light["x"] * 360.0, light["y"] * 460.0)
				check(is_finite(color.r) and is_finite(position.x) and is_finite(position.y), "Godot representation")
	check(seeds == [1592594996, 0, 4294967295], "Unsigned seed boundaries survive JSON import")
	check(sample_count == 21, "All samples consumed")
	var result := {"type": "godot-reference-import", "passed": failures.is_empty(), "engine": Engine.get_version_info()["string"], "cases": cases.size(), "samples": sample_count, "lights": light_count, "referenceCoreSha256": parsed.get("referenceCoreSha256"), "failures": Array(failures), "scope": "Headless JSON/coordinate import only; no native rendering, animation-port or window acceptance."}
	var output := FileAccess.open(report_path, FileAccess.WRITE)
	if output == null:
		push_error("Cannot write reference import report")
		quit(1)
		return
	output.store_string(JSON.stringify(result, "\t") + "\n")
	output.close()
	print(JSON.stringify(result))
	quit(0 if failures.is_empty() else 1)
