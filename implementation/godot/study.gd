extends Node2D
## Synthetic renderer study, not the installed desktop host or a live-status UI.
const Presence = preload("res://presence.gd")
const LightScene = preload("res://light_scene.gd")
const ResizePolicy = preload("res://resize_policy.gd")
const SettingsWindow = preload("res://settings_window.gd")
const DisplaySizing = preload("res://display_sizing.gd")
const ApiRecording = preload("res://api_recording.gd")
const InspectionWindow = preload("res://inspection_window.gd")
var _inspection: InspectionWindow
var _api_recording: RefCounted
var _model := Presence.new(0x5eed1234)
var _visual := LightScene.new()
var _elapsed := 0.0
var _frames := 0
var _smoke := false
var _instanced := false
var _reference_frame := false
const REFERENCE_TIME := 17.3
var _capturing := false
var _sample_usec := 0
var _queue_usec := 0
var _samples := 0
var _last_sample_usec := 0
var _smoke_phase := "starting"
var _smoke_started_usec := 0
var _backing := StyleBoxFlat.new()
var _face_rect := Rect2(8,8,180,230)
var _backing_rect := Rect2(8,8,180,230)
var _settings: SettingsWindow
var _reduced_motion := false
var _stay_above := true
var _press_pending := false
var _press_position := Vector2.ZERO
var _display_id := -1
var _display_area := Rect2i()
var _display_height_fraction := DisplaySizing.DEFAULT_HEIGHT_FRACTION
var _applying_display_size := false

func _ready() -> void:
	# Window interaction must not inherit the intentionally quiet light-update rate.
	Engine.max_fps = 60
	get_viewport().transparent_bg = true
	get_viewport().gui_embed_subwindows = false
	_smoke = OS.get_cmdline_user_args().has("--briar-smoke")
	_reference_frame = _smoke and OS.get_cmdline_user_args().has("--reference-frame")
	if OS.get_cmdline_user_args().has("--api-recording"):
		_api_recording = ApiRecording.new()
		if not _api_recording.open_recording(false,OS.get_cmdline_user_args().has("--inspection")):
			print(JSON.stringify({"type":"godot-api-recording-error","passed":false,"reason":_api_recording.validation_error}))
			_visual.free()
			get_tree().quit(2)
			return
	if _smoke and DisplayServer.get_name() == "headless":
		print(JSON.stringify({"type":"godot-render-smoke","passed":false,"reason":"Native viewport smoke requires a display; use the separate headless behaviour tests."}))
		_visual.free()
		get_tree().quit(2)
		return
	get_window().content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	get_window().content_scale_factor = 1.0
	get_window().always_on_top = _stay_above
	_instanced = OS.get_cmdline_user_args().has("--instanced-study")
	if _instanced:
		_visual.free()
		_visual = load("res://instanced_light_scene.gd").new()
	_smoke_started_usec = Time.get_ticks_usec()
	if _smoke:
		get_tree().create_timer(8.0,true,false,true).timeout.connect(_smoke_watchdog)
	_backing.bg_color = Color(21.0/255.0,38.0/255.0,57.0/255.0,.86)
	_backing.set_corner_radius_all(48)
	_backing.corner_detail = 16
	_backing.shadow_color = Color(21.0/255.0,38.0/255.0,57.0/255.0,.2)
	_backing.shadow_size = 6
	add_child(_visual)
	get_viewport().size_changed.connect(_layout)
	_sync_display()
	_layout()
	get_window().title = "Briar · synthetic API recording" if _api_recording != null else "Briar · corner-resize study"
	await RenderingServer.frame_post_draw
	print(JSON.stringify({"type":"godot-study-ready","pid":OS.get_process_id(),"displayServer":DisplayServer.get_name(),"syntheticOnly":true,"studyOnly":true,"resizable":not get_window().unresizable,"visibleResizeControls":false,"alwaysOnTop":get_window().always_on_top,"screen":_display_id,"usableDisplaySize":[_display_area.size.x,_display_area.size.y],"windowSize":[get_window().size.x,get_window().size.y],"faceSize":[_face_rect.size.x,_face_rect.size.y],"relativeHeight":_display_height_fraction}))

func _smoke_watchdog() -> void:
	if _smoke_phase == "capture-complete":
		return
	print(JSON.stringify({"type":"godot-smoke-timeout","phase":_smoke_phase,"frames":_frames,"elapsed":_elapsed,"wallSeconds":float(Time.get_ticks_usec()-_smoke_started_usec)/1000000.0,"meanModelUsec":float(_sample_usec)/maxi(1,_frames),"meanDrawCommandUsec":float(_visual.draw_usec_total)/maxi(1,_visual.draw_count),"visible":get_window().visible,"windowMode":get_window().mode,"focused":get_window().has_focus()}))
	get_tree().quit(1)

func _draw() -> void:
	draw_style_box(_backing,_backing_rect)

func _layout() -> void:
	var size := get_viewport_rect().size
	_backing_rect = ResizePolicy.backing_rect(size)
	_face_rect = ResizePolicy.face_rect(size)
	if not _applying_display_size and get_window().current_screen == _display_id and _display_area.size.y > 0:
		# Remember actual face size, even if the user made the backing wider/taller.
		_display_height_fraction = (_face_rect.size.y+DisplaySizing.GUTTER)/float(_display_area.size.y)
	_visual.position = _face_rect.position
	if not _visual._scene.is_empty():
		_visual.resize_scene(_face_rect.size)
	_backing.set_corner_radius_all(int(minf(_backing_rect.size.x,_backing_rect.size.y)*.27))
	queue_redraw()

func _sync_display() -> void:
	var display := get_window().current_screen
	var area := DisplayServer.screen_get_usable_rect(display)
	if area.size.x <= 0 or area.size.y <= 0 or (display == _display_id and area == _display_area):
		return
	_applying_display_size = true
	_display_id = display
	_display_area = area
	get_window().size = DisplaySizing.window_size(area.size,_display_height_fraction)
	get_window().position = DisplaySizing.fit_position(get_window().position,get_window().size,area)
	_layout()
	_applying_display_size = false

func _process(_delta: float) -> void:
	if _capturing or get_window().mode == Window.MODE_MINIMIZED:
		return
	_frames += 1
	var now := Time.get_ticks_usec()
	if now-_last_sample_usec < 83333 and not _visual._scene.is_empty():
		return
	_last_sample_usec = now
	_sync_display()
	if is_instance_valid(_inspection):
		_inspection.follow_face()
	# Godot clamps frame deltas under load. Use real elapsed time so slow frames
	# do not also slow the portable model's animation timeline.
	_elapsed = float(Time.get_ticks_usec()-_smoke_started_usec)/1000000.0
	_samples += 1
	if _samples == 1:
		_smoke_phase = "animating"
		if _smoke:
			print(JSON.stringify({"type":"godot-smoke-phase","phase":_smoke_phase,"windowMode":get_window().mode}))
	var started := Time.get_ticks_usec()
	var scene_time := REFERENCE_TIME if _reference_frame else _elapsed
	var scene := _scene_for_display(scene_time)
	if scene.is_empty() and _api_recording != null:
		print(JSON.stringify({"type":"godot-api-recording-error","passed":false,"reason":_api_recording.validation_error}))
		_visual.set_scene({},_face_rect.size,1.6,1.2)
		get_tree().quit(2)
		return
	_sample_usec += Time.get_ticks_usec()-started
	started = Time.get_ticks_usec()
	_visual.set_scene(scene,_face_rect.size,1.6,1.2)
	_queue_usec += Time.get_ticks_usec()-started
	if _smoke and Time.get_ticks_usec()-_smoke_started_usec >= 3000000:
		_capturing = true
		_smoke_phase = "capture-requested"
		print(JSON.stringify({"type":"godot-smoke-phase","phase":_smoke_phase,"frames":_frames}))
		await RenderingServer.frame_post_draw
		_smoke_phase = "capture-complete"
		var image := get_viewport().get_texture().get_image()
		var artifact_name := "godot-instanced-study" if _instanced else "godot-study"
		if _reference_frame:
			artifact_name += "-reference"
		var output_directory := OS.get_environment("BRIAR_PRESENCE_TEST_OUTPUT")
		if output_directory.is_empty():
			output_directory = ProjectSettings.globalize_path("res://").path_join("../test-artifacts").simplify_path()
		var output := output_directory.path_join(artifact_name+".png")
		var error := image.save_png(output)
		var passed := _visual.draw_count >= 12 and image.get_pixel(0,0).a == 0.0 and error == OK
		var result := {"type":"godot-render-smoke","passed":passed,"frames":_frames,"elapsed":_elapsed,"wallSeconds":float(Time.get_ticks_usec()-_smoke_started_usec)/1000000.0,"displayServer":DisplayServer.get_name(),"transparentCorner":image.get_pixel(0,0).a == 0.0,"image":output,"meanModelUsec":float(_sample_usec)/_frames,"meanQueueUsec":float(_queue_usec)/_frames,"meanDrawCommandUsec":float(_visual.draw_usec_total)/maxi(1,_visual.draw_count),"drawCommandFrames":_visual.draw_count,"studySha256":FileAccess.get_sha256("res://study.gd"),"rendererSha256":FileAccess.get_sha256("res://light_scene.gd"),"scope":"Finite own-viewport rendering and script timings only; not GPU time, native dragging, focus continuity, full resource accounting or host acceptance."}
		result["renderer"] = "instanced" if _instanced else "circle"
		result["modelSamples"] = _samples
		result["meanModelUsec"] = float(_sample_usec)/maxi(1,_samples)
		result["meanQueueUsec"] = float(_queue_usec)/maxi(1,_samples)
		result["referenceFrame"] = _reference_frame
		result["sampleTime"] = scene_time
		if _instanced:
			result["rendererSha256"] = FileAccess.get_sha256("res://instanced_light_scene.gd")
			result["shaderSha256"] = FileAccess.get_sha256("res://point_material.gdshader")
			result["packingSha256"] = FileAccess.get_sha256("res://point_batch.gd")
			result["meanPackingUsec"] = float(_visual.packing_usec_total)/maxi(1,_visual.packing_count)
		var report := FileAccess.open(output.get_base_dir().path_join(artifact_name+".json"),FileAccess.WRITE)
		if report == null:
			get_tree().quit(1)
			return
		report.store_string(JSON.stringify(result,"\t")+"\n")
		report.close()
		print(JSON.stringify(result))
		get_tree().quit(0 if passed else 1)

func _show_settings() -> void:
	_press_pending = false
	if is_instance_valid(_inspection):
		_inspection.hide()
	if not is_instance_valid(_settings):
		_settings = SettingsWindow.new()
		_settings.visible = false
		add_child(_settings)
		_settings.reduced_motion_changed.connect(_set_reduced_motion)
		_settings.stay_above_changed.connect(_set_stay_above)
		_settings.quit_requested.connect(func(): get_tree().quit())
	_settings.show_options(_reduced_motion,_stay_above,get_window())

func _show_inspection() -> void:
	_press_pending = false
	if _api_recording == null:
		_show_settings()
		return
	if is_instance_valid(_inspection) and _inspection.visible:
		_inspection.close_inspection()
		return
	if not is_instance_valid(_inspection):
		_inspection = InspectionWindow.new()
		_inspection.visible = false
		add_child(_inspection)
		_inspection.settings_requested.connect(_show_settings)
	_inspection.show_inspection(_api_recording.current.get("semantic",{}),get_window())

func _set_reduced_motion(value: bool) -> void:
	_reduced_motion = value
	var scene_time := REFERENCE_TIME if _reference_frame else _elapsed
	_visual.set_scene(_scene_for_display(scene_time),_face_rect.size,1.6,1.2)

func _scene_for_display(scene_time: float) -> Dictionary:
	if _api_recording != null:
		var scene: Dictionary = _api_recording.sample(scene_time,_reduced_motion)
		if is_instance_valid(_inspection):
			_inspection.set_semantic(_api_recording.current.get("semantic",{}))
		return scene
	return _model.sample({"time":scene_time,"state":"quiet","reducedMotion":_reduced_motion})

func _set_stay_above(value: bool) -> void:
	_stay_above = value
	get_window().always_on_top = value

func _begin_face_drag() -> void:
	DisplayServer.window_start_drag()

func _begin_corner_resize(edge: int) -> void:
	DisplayServer.window_start_resize(edge)

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE and is_instance_valid(_inspection) and _inspection.visible:
			_inspection.close_inspection()
			return
		if event.keycode == KEY_ESCAPE or (event.keycode == KEY_Q and event.ctrl_pressed):
			get_tree().quit()
		elif event.keycode == KEY_F1:
			_show_settings()
		elif event.keycode == KEY_ENTER or event.keycode == KEY_SPACE:
			_show_inspection()
		elif event.keycode == KEY_M:
			_set_reduced_motion(not _reduced_motion)
		elif event.keycode == KEY_T:
			_set_stay_above(not _stay_above)
	if event is InputEventMouseMotion:
		var edge := ResizePolicy.corner_edge(event.position,get_viewport_rect().size)
		Input.set_default_cursor_shape(ResizePolicy.cursor_for_edge(edge))
		if _press_pending and event.position.distance_to(_press_position) >= 6.0:
			_press_pending = false
			_begin_face_drag()
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			var edge := ResizePolicy.corner_edge(event.position,get_viewport_rect().size)
			_press_pending = false
			if edge != -1:
				_begin_corner_resize(edge)
			elif _backing_rect.has_point(event.position):
				_press_pending = true
				_press_position = event.position
		elif _press_pending:
			_press_pending = false
			_show_inspection()
