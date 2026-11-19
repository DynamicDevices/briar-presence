extends SceneTree
var failures: Array[String] = []

func check(value: bool, label: String) -> void:
	if not value:
		failures.append(label)

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	if DisplayServer.get_name() == "headless":
		quit(2)
		return
	create_timer(8.0).timeout.connect(func(): quit(1))
	var host = load("res://study.tscn").instantiate()
	root.add_child(host)
	await RenderingServer.frame_post_draw
	check(not is_instance_valid(host._settings),"no settings window at rest")
	check(root.always_on_top and host._stay_above,"stay above defaults on")
	var key := InputEventKey.new()
	key.pressed = true
	key.keycode = KEY_F1
	host._input(key)
	await RenderingServer.frame_post_draw
	var settings: Window = host._settings
	check(settings.visible and not settings.is_embedded(),"separate native settings")
	check(settings.borderless,"no settings title bar")
	check(settings.motion.get_theme_color("font_focus_color").r < 0.5,"focused text stays dark")
	check(settings.motion.get_theme_font_size("font_size") == roundi(16*settings.ui_scale),"display-scaled text")
	check(not settings.exclusive,"settings are non-modal")
	check(settings.motion.has_focus(),"first control keyboard focus")
	var before: int = host._frames
	settings.grab_focus()
	await create_timer(0.5).timeout
	check(host._frames > before,"face continues with settings focused")
	var face_unfocused := not root.has_focus()
	check(face_unfocused,"face lost native focus to settings")
	settings.motion.button_pressed = true
	await RenderingServer.frame_post_draw
	check(host._reduced_motion,"reduced motion checkbox connected")
	var lights: Array = host._visual._scene["lights"].duplicate(true)
	var frozen_before := JSON.stringify(lights)
	await create_timer(0.25).timeout
	var frozen_after := JSON.stringify(host._visual._scene["lights"])
	if frozen_before != frozen_after:
		print(JSON.stringify({"type":"reduced-motion-diagnostic","reducedMotion":host._reduced_motion,"firstBefore":lights[0],"firstAfter":host._visual._scene["lights"][0]}))
	check(frozen_before == frozen_after,"reduced motion holds lights still")
	settings.above.button_pressed = false
	check(not root.always_on_top and not host._stay_above,"stay above can be disabled")
	settings.above.button_pressed = true
	check(root.always_on_top and host._stay_above,"stay above can be restored")
	var output := ProjectSettings.globalize_path("res://../test-artifacts/godot-settings-study.png")
	check(settings.get_texture().get_image().save_png(output) == OK,"own settings capture")
	key.keycode = KEY_ESCAPE
	settings._input(key)
	check(not settings.visible and is_instance_valid(host),"Escape hides settings, keeps face")
	key.keycode = KEY_M
	host._input(key)
	check(not host._reduced_motion,"keyboard restores animation")
	var quit_signal := [false]
	settings.quit_requested.connect(func(): quit_signal[0] = true)
	settings.quit_button.pressed.emit()
	check(quit_signal[0],"quit button emits exit request")
	var result := {"type":"godot-controls-study","passed":failures.is_empty(),"failures":failures,"faceUnfocused":face_unfocused,"framesBeforeSettings":before,"framesAfterSettings":host._frames,"settingsSize":[settings.size.x,settings.size.y],"settingsScale":settings.ui_scale,"borderless":settings.borderless,"settingsImage":output,"scope":"Native separate-window and programmatic control/keyboard-handler checks; not real pointer dragging, compositor stacking, screen-reader acceptance or final installation."}
	var report := FileAccess.open(ProjectSettings.globalize_path("res://../test-artifacts/godot-controls-study.json"),FileAccess.WRITE)
	if report == null:
		quit(1)
		return
	report.store_string(JSON.stringify(result,"\t")+"\n")
	print(JSON.stringify(result))
	quit(0 if failures.is_empty() else 1)
