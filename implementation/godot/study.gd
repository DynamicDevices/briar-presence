extends Node2D
## Synthetic renderer study, not the installed desktop host or a live-status UI.
const Presence = preload("res://presence.gd")
const LightScene = preload("res://light_scene.gd")
var _model := Presence.new(0x5eed1234)
var _visual := LightScene.new()
var _elapsed := 0.0
var _frames := 0
var _smoke := false
var _capturing := false
var _backing := StyleBoxFlat.new()
const FACE_RECT := Rect2(50,90,180,230)

func _ready() -> void:
	Engine.max_fps = 12
	get_viewport().transparent_bg = true
	_smoke = OS.get_cmdline_user_args().has("--briar-smoke")
	_backing.bg_color = Color(21.0/255.0,38.0/255.0,57.0/255.0,.86)
	_backing.set_corner_radius_all(48)
	_backing.corner_detail = 16
	_backing.shadow_color = Color(21.0/255.0,38.0/255.0,57.0/255.0,.2)
	_backing.shadow_size = 6
	_visual.position = FACE_RECT.position
	add_child(_visual)
	queue_redraw()
	print(JSON.stringify({"type":"godot-study-ready","pid":OS.get_process_id(),"displayServer":DisplayServer.get_name(),"syntheticOnly":true,"studyOnly":true}))

func _draw() -> void:
	draw_style_box(_backing,FACE_RECT)

func _process(delta: float) -> void:
	if _capturing or get_window().mode == Window.MODE_MINIMIZED:
		return
	_elapsed += delta
	_frames += 1
	_visual.set_scene(_model.sample({"time":_elapsed,"state":"quiet","reducedMotion":false}),FACE_RECT.size,1.6,1.2)
	if _smoke and _elapsed >= 3.0:
		_capturing = true
		await RenderingServer.frame_post_draw
		var image := get_viewport().get_texture().get_image()
		var output := ProjectSettings.globalize_path("res://").path_join("../test-artifacts/godot-study.png").simplify_path()
		var error := image.save_png(output)
		var passed := _frames >= 12 and image.get_pixel(0,0).a == 0.0 and error == OK
		var result := {"type":"godot-render-smoke","passed":passed,"frames":_frames,"elapsed":_elapsed,"displayServer":DisplayServer.get_name(),"transparentCorner":image.get_pixel(0,0).a == 0.0,"image":output,"scope":"Finite own-viewport rendering only; native dragging, focus continuity, visual fidelity, resources and full controls are not verified."}
		var report := FileAccess.open(output.get_base_dir().path_join("godot-study.json"),FileAccess.WRITE)
		if report == null:
			get_tree().quit(1)
			return
		report.store_string(JSON.stringify(result,"\t")+"\n")
		report.close()
		print(JSON.stringify(result))
		get_tree().quit(0 if passed else 1)

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		get_tree().quit()
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT and FACE_RECT.has_point(event.position):
		DisplayServer.window_start_drag()
