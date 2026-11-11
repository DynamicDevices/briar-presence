extends Window
## Separate, display-scaled, borderless settings. No controls over the face.
const Sizing = preload("res://display_sizing.gd")
signal reduced_motion_changed(value: bool)
signal stay_above_changed(value: bool)
signal quit_requested
var motion: CheckButton
var above: CheckButton
var stacking_note: Label
var shortcut_hint: Label
var done: Button
var _panel: PanelContainer
var ui_scale := 1.0

func _ready() -> void:
	title = "Briar · display settings"
	borderless = true
	transparent = true
	transparent_bg = true
	unresizable = true
	transient = true
	exclusive = false
	content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	close_requested.connect(hide)

func _toggle_texture(pressed: bool, scale: float) -> ImageTexture:
	var image := Image.new()
	var track := "#467a9b" if pressed else "#9baab4"
	var x := 20 if pressed else 9
	var svg := '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20"><rect x="1" y="2" width="28" height="16" rx="8" fill="%s"/><circle cx="%s" cy="10" r="6" fill="white"/></svg>' % [track,x]
	image.load_svg_from_string(svg,scale)
	return ImageTexture.create_from_image(image)

func _build_ui(scale: float) -> void:
	if is_instance_valid(_panel):
		_panel.free()
	_panel = PanelContainer.new()
	_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var backing := StyleBoxFlat.new()
	backing.bg_color = Color("edf2f5")
	backing.set_corner_radius_all(roundi(16*scale))
	backing.content_margin_left = 20*scale
	backing.content_margin_right = 20*scale
	backing.content_margin_top = 18*scale
	backing.content_margin_bottom = 18*scale
	_panel.add_theme_stylebox_override("panel",backing)
	add_child(_panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",roundi(12*scale))
	_panel.add_child(column)
	var heading := Label.new()
	heading.text = "Briar display"
	heading.add_theme_color_override("font_color",Color("20364a"))
	heading.add_theme_font_size_override("font_size",roundi(21*scale))
	heading.mouse_filter = Control.MOUSE_FILTER_STOP
	heading.tooltip_text = "Drag to move these settings"
	heading.gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			DisplayServer.window_start_drag(get_window_id()))
	column.add_child(heading)
	shortcut_hint = Label.new()
	shortcut_hint.add_theme_color_override("font_color",Color("354e61"))
	shortcut_hint.add_theme_font_size_override("font_size",roundi(13*scale))
	column.add_child(shortcut_hint)
	motion = CheckButton.new()
	above = CheckButton.new()
	motion.text = "Reduced motion"
	above.text = "Stay above other windows"
	var checked := _toggle_texture(true,scale)
	var unchecked := _toggle_texture(false,scale)
	for button: CheckButton in [motion,above]:
		for state: String in ["font_color","font_hover_color","font_pressed_color","font_focus_color","font_hover_pressed_color"]:
			button.add_theme_color_override(state,Color("20364a"))
		button.add_theme_font_size_override("font_size",roundi(16*scale))
		button.add_theme_icon_override("checked",checked)
		button.add_theme_icon_override("unchecked",unchecked)
		button.custom_minimum_size.y = 34*scale
		column.add_child(button)
	motion.toggled.connect(func(value: bool): reduced_motion_changed.emit(value))
	above.toggled.connect(func(value: bool): stay_above_changed.emit(value))
	stacking_note = Label.new()
	stacking_note.text = "Wayland: your desktop controls window stacking.\nBriar cannot enable stay-above here."
	stacking_note.add_theme_color_override("font_color",Color("354e61"))
	stacking_note.add_theme_font_size_override("font_size",roundi(13*scale))
	column.add_child(stacking_note)
	_configure_stacking(DisplayServer.get_name())
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",roundi(12*scale))
	column.add_child(row)
	done = Button.new()
	done.text = "Done"
	for button: Button in [done]:
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.custom_minimum_size.y = 40*scale
		button.add_theme_font_size_override("font_size",roundi(16*scale))
		for state: String in ["font_color","font_hover_color","font_pressed_color","font_focus_color"]:
			button.add_theme_color_override(state,Color("20364a"))
		for state: String in ["normal","hover","pressed"]:
			var style := StyleBoxFlat.new()
			style.bg_color = Color("d7e3eb") if state == "normal" else Color("c6d9e6")
			style.set_corner_radius_all(roundi(8*scale))
			button.add_theme_stylebox_override(state,style)
		row.add_child(button)
	done.pressed.connect(hide)

func show_options(reduced_motion: bool, stay_above: bool, face: Window) -> void:
	var area := DisplayServer.screen_get_usable_rect(face.current_screen)
	ui_scale = Sizing.settings_scale(area.size,DisplayServer.get_name() == "Wayland")
	_build_ui(ui_scale)
	min_size = Vector2i.ZERO
	var content_minimum := _panel.get_combined_minimum_size()
	size = Vector2i(maxi(roundi(400*ui_scale),ceili(content_minimum.x)),maxi(roundi(300*ui_scale),ceili(content_minimum.y)))
	min_size = size
	current_screen = face.current_screen
	# A transient follows its parent; X11 rejects combining that with an
	# independent always-on-top flag on the child window.
	motion.set_pressed_no_signal(reduced_motion)
	above.set_pressed_no_signal(stay_above and not above.disabled)
	position = Sizing.settings_position(Rect2i(face.position,face.size),size,area,roundi(16*ui_scale))
	show()
	motion.grab_focus()
	grab_focus()

func _configure_stacking(backend: String) -> void:
	var compositor_controlled := backend == "Wayland"
	above.visible = not compositor_controlled
	above.disabled = compositor_controlled
	if compositor_controlled:
		above.set_pressed_no_signal(false)
	stacking_note.visible = compositor_controlled
	shortcut_hint.text = "Synthetic preview — not connected\nDrag the face to move; drag a corner to resize.\nF1: settings · M: reduced motion"
	if not compositor_controlled:
		shortcut_hint.text += " · T: stay above"
	shortcut_hint.text += "\nEscape: close settings · Right-click face: menu"

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			hide()
			set_input_as_handled()
		elif event.keycode == KEY_Q and event.ctrl_pressed:
			quit_requested.emit()
			set_input_as_handled()
