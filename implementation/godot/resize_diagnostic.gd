extends SceneTree
## Temporary native-window diagnostic. No face, recording or status integration.
const Corners = preload("res://resize_policy.gd")
const Sizing = preload("res://display_sizing.gd")

func _initialize() -> void:
	_start.call_deferred()

func _start() -> void:
	Engine.max_fps = 60
	root.title = "Briar · plain resize diagnostic"
	root.borderless = true
	root.unresizable = false
	root.always_on_top = true
	root.transparent = false
	root.transparent_bg = false
	root.content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	RenderingServer.set_default_clear_color(Color(0.082,0.149,0.224,1.0))
	var area := DisplayServer.screen_get_usable_rect(root.current_screen)
	root.size = Sizing.window_size(area.size)
	root.position = Sizing.fit_position(root.position,root.size,area)
	var caption := Label.new()
	caption.text = "Briar — plain resize test\n\nDrag a corner.\nNo face renderer or animation.\nEscape closes this diagnostic."
	caption.position = Vector2(40,40)
	caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caption.add_theme_font_size_override("font_size",20)
	root.add_child(caption)
	root.window_input.connect(_on_input)
	root.close_requested.connect(quit)
	await RenderingServer.frame_post_draw
	print(JSON.stringify({"type":"godot-plain-resize-ready","pid":OS.get_process_id(),"displayServer":DisplayServer.get_name(),"transparentWindow":root.transparent,"transparentViewport":root.transparent_bg,"faceRenderer":false,"animation":false,"resizable":not root.unresizable,"windowSize":[root.size.x,root.size.y]}))

func _on_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		quit()
	if event is InputEventMouseMotion:
		Input.set_default_cursor_shape(Corners.cursor_for_edge(Corners.corner_edge(event.position,Vector2(root.size))))
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var edge := Corners.corner_edge(event.position,Vector2(root.size))
		if edge != -1:
			DisplayServer.window_start_resize(edge)
