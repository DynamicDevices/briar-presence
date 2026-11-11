extends SceneTree
const Tape = preload("res://api_recording.gd")
var failures: Array[String] = []
var checks := 0
func check(value: bool,label: String) -> void:
	checks += 1
	if not value: failures.append(label)
func _initialize() -> void:
	var tape := Tape.new()
	var full_recording := OS.get_cmdline_user_args().has("--full-recording")
	check(tape.open_recording(not full_recording),"open canonical accepted-state recording")
	if not tape.validation_error.is_empty():
		print(JSON.stringify({"passed":false,"error":tape.validation_error}))
		quit(1)
		return
	var working: Dictionary = tape.sample(0.01,false)
	check(working.get("state") == "working","work state")
	check(working.get("lights",[]).size() == 1170,"all reference lights")
	var possible: Dictionary = tape.sample(4.1,false)
	check(tape.current.semantic.concerns[0].severity.assessment == "provisional","possible impact is provisional")
	var critical: Dictionary = tape.sample(8.1,false)
	check(tape.current.semantic.concerns[0].severity.assessment == "established","confirmed impact")
	check(possible.glows != critical.glows,"colour/geometry treatment changes")
	tape.sample(12.1,false)
	check(tape.current.semantic.concerns[0].acknowledged and tape.current.semantic.concerns[0].lifecycle == "open","acknowledgement is not resolution")
	tape.sample(16.1,false)
	check(tape.current.semantic.concerns[0].lifecycle == "resolved","explicit closure")
	check(tape.sample(22.6,false).get("state") == "unknown","expiry is unknown")
	check(tape.sample(25.99,false).get("state") == "unknown","consume through final frame")
	check(tape.validation_error.is_empty(),"valid tape completed without error")
	check(tape.sample(26.01,false) == working,"loop resets to exact reference frame")
	var reduced: Dictionary = tape.sample(0.01,true)
	check(reduced != working,"independent reduced-motion scene")
	var invalid := working.duplicate(true)
	invalid.lights[0].color = [256,0,0]
	check(not tape.valid_scene(invalid),"reject out-of-range colour")
	invalid = working.duplicate(true)
	invalid.lights[0].radius = -1
	check(not tape.valid_scene(invalid),"reject invalid radius")
	invalid = working.duplicate(true)
	invalid.aspect = 1.0
	check(not tape.valid_scene(invalid),"reject incompatible aspect")
	var fixture_path := ProjectSettings.globalize_path("res://../test-artifacts/api-overlay-sample.jsonl").simplify_path()
	var original := FileAccess.get_file_as_string(fixture_path)
	var lines := original.split("\n")
	var writer := FileAccess.open(fixture_path,FileAccess.WRITE)
	writer.store_string(lines[0]+"\n"+lines[1]+"\n")
	writer.close()
	var truncated := Tape.new()
	check(truncated.open_recording(true),"open truncated body before EOF is reached")
	check(truncated.sample(22.5,false).is_empty() and not truncated.validation_error.is_empty(),"truncation fails closed without retaining a healthy scene")
	writer = FileAccess.open(fixture_path,FileAccess.WRITE)
	writer.store_string(original)
	writer.close()
	var header: Dictionary = JSON.parse_string(lines[0])
	var misleading: Dictionary = JSON.parse_string(lines[1])
	header.frameCount = 1
	misleading.semantic.baseState = "unknown"
	writer = FileAccess.open(fixture_path,FileAccess.WRITE)
	writer.store_string(JSON.stringify(header)+"\n"+JSON.stringify(misleading)+"\n")
	writer.close()
	var contradictory := Tape.new()
	check(not contradictory.open_recording(true),"unknown semantics cannot be paired with a working scene")
	writer = FileAccess.open(fixture_path,FileAccess.WRITE)
	writer.store_string(original)
	writer.close()
	check(tape.sample(-1,false).is_empty() and not tape.validation_error.is_empty(),"invalid time fails closed")
	print(JSON.stringify({"type":"godot-api-scene-recording","passed":failures.is_empty(),"checks":checks,"failures":failures,"scope":"Headless exact synthetic API scene playback, semantics, looping, reduced scene and structural rejection; no desktop pixel or live-system acceptance."}))
	quit(0 if failures.is_empty() else 1)
