extends SceneTree
const Model = preload("res://inspection_model.gd")
const Layout = preload("res://inspection_layout.gd")
const Inspection = preload("res://inspection_window.gd")
const InputHost = preload("res://inspection_input_host.gd")
const ApiRecording = preload("res://api_recording.gd")
const Sizing = preload("res://display_sizing.gd")
var failures: Array[String] = []
var checks := 0

func check(value: bool, label: String) -> void:
	checks += 1
	if not value:
		failures.append(label)

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	var path := ProjectSettings.globalize_path("res://../test-artifacts/inspection-accepted-vectors.json")
	var file := FileAccess.open(path,FileAccess.READ)
	if file == null:
		print("Generate inspection vectors first")
		quit(2)
		return
	var data: Variant = JSON.parse_string(file.get_as_text())
	file.close()
	if not data is Dictionary or data.get("kind") != "briar-synthetic-inspection-vectors" or data.get("syntheticOnly") != true:
		quit(2)
		return
	var original := JSON.stringify(data)
	for vector: Dictionary in data.vectors:
		var actual := Model.project(vector.semantic,vector.selected)
		check(actual.ok,"accepted vector: "+vector.label)
		for field: String in ["tasks","selected","unknown","counts","unassignedConcerns","unassignedRequests","details"]:
			# JSON.parse_string uses floating JSON numbers; normalise native counts
			# through the same boundary before Dictionary's strict value comparison.
			check(JSON.parse_string(JSON.stringify(actual.get(field))) == vector.expected.get(field),"projection parity %s / %s / %s" % [vector.label,vector.selected,field])
	check(original == JSON.stringify(data),"projection never mutates accepted input")
	check(not Model.project({}).ok,"missing state is not healthy")
	check(not Model.project({"mode":"synthetic","baseState":"working","work":[null],"concerns":[],"requests":[]}).ok,"malformed detail fails safely")
	var uncertain := {"summary":"Possible issue","lifecycle":"open","acknowledged":true,"freshness":"stale","sourceOmitted":true,"severity":{"level":"critical","assessment":"provisional","impact":"Risk example","evidence":"Check example"}}
	var text := Model.concern_text(uncertain)
	check(text.contains("not confirmed") and text.contains("still open, not resolved"),"uncertainty and acknowledgement distinguished")
	check(text.contains("stale") and text.contains("omitted by source") and text.contains("Risk example") and text.contains("Check example"),"freshness impact and evidence retained")
	for area: Rect2i in [Rect2i(0,0,1920,1080),Rect2i(1920,0,3840,2160),Rect2i(-1080,0,1080,1920),Rect2i(0,0,360,640)]:
		var face := Rect2i(area.position+Vector2i(16,16),Vector2i(196,246))
		var placement := Layout.plan(face,area,Sizing.settings_scale(area.size))
		check(placement.ok,"placement available "+str(area))
		if placement.ok:
			check(area.encloses(placement.rect) and not face.intersects(placement.rect),"panel on screen and beside/below face "+str(area))
	check(not Layout.plan(Rect2i(0,0,360,640),Rect2i(0,0,360,640),1.0).ok,"no-space never overlaps face")
	var tape := ApiRecording.new()
	var full := OS.get_cmdline_user_args().has("--full-inspection")
	check(tape.open_recording(not full,true),"native inspection tape opens")
	check(not tape.sample(0.01,false).is_empty(),"native inspection scene reads from actual accepted state")
	check(Model.project(tape.current.semantic).counts.work == 3,"face and panel share three simultaneous tasks")
	var initial_semantic: Dictionary = tape.current.semantic.duplicate(true)
	tape.sample(8.01,false)
	check(tape.current.semantic.concerns.any(func(c: Dictionary): return c.id == "worry" and c.acknowledged and c.lifecycle == "open"),"tape acknowledgement is not resolution")
	tape.sample(22.5,false)
	check(tape.current.semantic.baseState == "unknown","inspection tape actually expires")
	check(not tape.sample(25.99,false).is_empty() and tape.validation_error.is_empty(),"consume inspection tape through final frame")
	tape.sample(26.01,false)
	check(tape.current.semantic.work.size() == 3 and tape.current.semantic.baseState != "unknown","inspection tape loops back to three tasks")
	tape.sample(22.5,true)
	var panel := Inspection.new()
	panel.visible = false
	root.add_child(panel)
	panel._build()
	panel.set_semantic(initial_semantic)
	check(panel.borderless and panel.transient and not panel.exclusive,"borderless non-modal inspection")
	check(not panel.visible,"panel does not auto-open on state update")
	check(panel._rows.size() == 3,"native task widgets reflect all three tasks")
	if not panel._rows.is_empty():
		panel._rows[0].pressed.emit()
		check(not panel.selected_key.is_empty(),"task button selects locally")
		check(original == JSON.stringify(data),"task selection leaves shared data untouched")
	var selected := panel.selected_key
	panel.set_semantic(data.vectors[-1].semantic)
	check(panel.selected_key == selected,"refresh does not force a different task")
	check(panel._status.text.contains("unknown"),"expired source has explicit native unknown label")
	panel._overview.pressed.emit()
	check(panel.selected_key.is_empty(),"All work clears only local selection")
	panel.set_semantic({})
	check(panel._status.text.contains("unknown"),"invalid panel data has unknown label")
	var escape := InputEventKey.new()
	escape.pressed = true
	escape.keycode = KEY_ESCAPE
	panel._input(escape)
	check(not panel.visible,"Escape closes panel without exiting host")
	panel.free()
	var host := InputHost.new()
	root.add_child(host)
	var press := InputEventMouseButton.new()
	press.button_index = MOUSE_BUTTON_LEFT
	press.pressed = true
	press.position = Vector2(70,70)
	host._input(press)
	var release := press.duplicate() as InputEventMouseButton
	release.pressed = false
	host._input(release)
	check(host.inspections == 1 and host.drags == 0,"click opens inspection, not drag")
	host._input(press)
	var motion := InputEventMouseMotion.new()
	motion.position = Vector2(73,72)
	host._input(motion)
	check(host.drags == 0,"small pointer jitter is not drag")
	motion.position = Vector2(90,70)
	host._input(motion)
	host._input(release)
	check(host.drags == 1 and host.inspections == 1,"drag threshold consumes click")
	press.position = Vector2(1,1)
	host._input(press)
	host._input(release)
	check(host.resizes == 1 and host.inspections == 1,"corner resize takes priority over inspection")
	var enter := InputEventKey.new()
	enter.pressed = true
	enter.keycode = KEY_ENTER
	host._input(enter)
	check(host.inspections == 2,"keyboard activation opens inspection")
	host.free()
	var result := {"type":"godot-inspection-headless","passed":failures.is_empty(),"checks":checks,"failures":failures,"vectors":data.vectors.size(),"scope":"Accepted-state projection, geometry and programmatic widget/keyboard checks only; not native pointer, rendered pixels, compositor or screen-reader acceptance."}
	result.fullRecording = full
	result.sources = {}
	for source: String in ["study.gd","api_recording.gd","inspection_model.gd","inspection_layout.gd","inspection_window.gd","inspection_test.gd","inspection_input_host.gd"]:
		result.sources[source] = FileAccess.get_sha256("res://"+source)
	result.vectorsSha256 = FileAccess.get_sha256(path)
	result.tapeSha256 = FileAccess.get_sha256(ProjectSettings.globalize_path("res://../test-artifacts/api-inspection-"+("recording" if full else "sample")+".jsonl"))
	var report := FileAccess.open(ProjectSettings.globalize_path("res://../test-artifacts/godot-inspection-results.json"),FileAccess.WRITE)
	if report != null:
		report.store_string(JSON.stringify(result,"\t")+"\n")
	print(JSON.stringify(result))
	quit(0 if failures.is_empty() else 1)
