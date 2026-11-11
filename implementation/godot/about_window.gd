extends Window
## A gentle on-demand application notice, not display configuration.
const Sizing = preload("res://display_sizing.gd")
const Layout = preload("res://inspection_layout.gd")
const SOURCE_URL := "https://github.com/DynamicDevices/briar-presence"
var _panel: PanelContainer
var _face: Window
var close_button: Button
var source_button: LinkButton
var ui_scale := 1.0

func _ready() -> void:
	title = "About Briar"
	borderless = true
	transparent = true
	transparent_bg = true
	unresizable = true
	transient = true
	exclusive = false
	content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	close_requested.connect(close_about)

func _label(text: String, parent: Node, heading: bool = false) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_color_override("font_color",Color("20364a"))
	label.add_theme_font_size_override("font_size",roundi((21 if heading else 14)*ui_scale))
	parent.add_child(label)
	return label

func build(scale: float) -> void:
	ui_scale = scale
	if is_instance_valid(_panel):
		_panel.free()
	_panel = PanelContainer.new()
	_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var backing := StyleBoxFlat.new()
	backing.bg_color = Color("edf2f5")
	backing.set_corner_radius_all(roundi(22*scale))
	backing.set_content_margin_all(20*scale)
	_panel.add_theme_stylebox_override("panel",backing)
	add_child(_panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",roundi(14*scale))
	_panel.add_child(column)
	_label("About Briar Presence",column,true)
	_label("A quiet visual language for work and interaction.\n\n0.1.0 development preview\nGodot %s\n\nGPL version 3 or later · no warranty.\nGodot and dependencies retain their own licences.\n\nSynthetic preview — no live harness connected.\nAssisted-by: Briar" % Engine.get_version_info().get("string",""),column)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",roundi(16*scale))
	column.add_child(row)
	source_button = LinkButton.new()
	source_button.text = "Project source"
	source_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	source_button.add_theme_color_override("font_color",Color("376784"))
	source_button.add_theme_font_size_override("font_size",roundi(14*scale))
	source_button.pressed.connect(func(): OS.shell_open(SOURCE_URL))
	row.add_child(source_button)
	close_button = Button.new()
	close_button.text = "Close"
	close_button.custom_minimum_size = Vector2(100*scale,40*scale)
	close_button.add_theme_font_size_override("font_size",roundi(15*scale))
	for state: String in ["font_color","font_hover_color","font_pressed_color","font_focus_color"]:
		close_button.add_theme_color_override(state,Color("20364a"))
	for state: String in ["normal","hover","pressed","focus"]:
		var button_backing := StyleBoxFlat.new()
		button_backing.bg_color = Color("dce8ef") if state == "normal" else Color("cbdfe9")
		button_backing.set_corner_radius_all(roundi(8*scale))
		close_button.add_theme_stylebox_override(state,button_backing)
	close_button.pressed.connect(close_about)
	row.add_child(close_button)

func show_about(face: Window) -> bool:
	_face = face
	var area := DisplayServer.screen_get_usable_rect(face.current_screen)
	var scale := Sizing.settings_scale(area.size)
	var placement := Layout.plan(Rect2i(face.position,face.size),area,scale)
	if not placement.ok:
		return false
	build(scale)
	current_screen = face.current_screen
	min_size = Vector2i.ZERO
	size = Vector2i(mini(roundi(440*scale),placement.rect.size.x),mini(roundi(420*scale),placement.rect.size.y))
	position = placement.rect.position
	show()
	close_button.grab_focus()
	grab_focus()
	return true

func close_about() -> void:
	hide()
	if is_instance_valid(_face):
		_face.grab_focus()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		close_about()
		set_input_as_handled()
