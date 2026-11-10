extends Window
## A separate, non-modal study window. No controls are drawn over the face.
signal reduced_motion_changed(value: bool)
signal stay_above_changed(value: bool)
signal quit_requested
var motion := CheckButton.new()
var above := CheckButton.new()
var done := Button.new()
var quit_button := Button.new()

func _ready() -> void:
	title = "Briar · display settings"
	size = Vector2i(360,320)
	min_size = Vector2i(320,300)
	unresizable = false
	transient = true
	exclusive = false
	var panel := PanelContainer.new()
	panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var backing := StyleBoxFlat.new()
	backing.bg_color = Color("edf2f5")
	backing.set_corner_radius_all(16)
	backing.content_margin_left = 20
	backing.content_margin_right = 20
	backing.content_margin_top = 18
	backing.content_margin_bottom = 18
	panel.add_theme_stylebox_override("panel",backing)
	add_child(panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",12)
	panel.add_child(column)
	var heading := Label.new()
	heading.text = "Briar display"
	heading.add_theme_color_override("font_color",Color("20364a"))
	heading.add_theme_font_size_override("font_size",21)
	column.add_child(heading)
	var hint := Label.new()
	hint.text = "Synthetic preview — not connected\nDrag the face to move; drag a corner to resize.\nF1: settings · M: reduced motion · T: stay above\nEscape: close settings · Ctrl+Q: quit"
	hint.add_theme_color_override("font_color",Color("354e61"))
	hint.add_theme_font_size_override("font_size",13)
	column.add_child(hint)
	motion.text = "Reduced motion"
	above.text = "Stay above other windows"
	for button: CheckButton in [motion,above]:
		button.add_theme_color_override("font_color",Color("20364a"))
		button.add_theme_color_override("font_hover_color",Color("20364a"))
		button.add_theme_color_override("font_pressed_color",Color("20364a"))
		column.add_child(button)
	motion.toggled.connect(func(value: bool): reduced_motion_changed.emit(value))
	above.toggled.connect(func(value: bool): stay_above_changed.emit(value))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",12)
	column.add_child(row)
	done.text = "Done"
	quit_button.text = "Quit Briar"
	for button: Button in [done,quit_button]:
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(button)
	done.pressed.connect(hide)
	quit_button.pressed.connect(func(): quit_requested.emit())
	close_requested.connect(hide)

func show_options(reduced_motion: bool, stay_above: bool, face: Window) -> void:
	motion.set_pressed_no_signal(reduced_motion)
	above.set_pressed_no_signal(stay_above)
	position = face.position+Vector2i(face.size.x+16,0)
	show()
	motion.grab_focus()
	grab_focus()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			hide()
			set_input_as_handled()
		elif event.keycode == KEY_Q and event.ctrl_pressed:
			quit_requested.emit()
			set_input_as_handled()
