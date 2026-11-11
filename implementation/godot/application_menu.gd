extends PopupMenu
## Application actions stay hidden until the face's context menu is requested.
const Sizing = preload("res://display_sizing.gd")
const SETTINGS := 1
const ABOUT := 2
const QUIT := 3
signal settings_requested
signal about_requested
signal quit_requested

func _ready() -> void:
	borderless = true
	transparent = true
	transparent_bg = true
	transient = true
	prefer_native_menu = false
	id_pressed.connect(_activate)
	configure(1.0)

func configure(scale: float) -> void:
	clear()
	add_item("Display settings",SETTINGS)
	add_item("About Briar",ABOUT)
	add_separator()
	add_item("Quit Briar",QUIT,KEY_Q|KEY_MASK_CTRL)
	add_theme_font_size_override("font_size",roundi(15*scale))
	add_theme_constant_override("v_separation",roundi(12*scale))
	for state: String in ["font_color","font_hover_color","font_accelerator_color"]:
		add_theme_color_override(state,Color("20364a"))
	var panel := StyleBoxFlat.new()
	panel.bg_color = Color("edf2f5")
	panel.set_corner_radius_all(roundi(14*scale))
	panel.set_content_margin_all(12*scale)
	add_theme_stylebox_override("panel",panel)
	var hover := StyleBoxFlat.new()
	hover.bg_color = Color("cbdfe9")
	hover.set_corner_radius_all(roundi(8*scale))
	add_theme_stylebox_override("hover",hover)

func show_menu(point: Vector2i, face: Window) -> void:
	var area := DisplayServer.screen_get_usable_rect(face.current_screen)
	configure(Sizing.settings_scale(area.size,DisplayServer.get_name() == "Wayland"))
	current_screen = face.current_screen
	reset_size()
	var desired := get_contents_minimum_size()
	desired.x = maxi(desired.x,roundi(230*Sizing.settings_scale(area.size,DisplayServer.get_name() == "Wayland")))
	popup(Rect2i(Sizing.fit_position(point+Vector2i(8,8),desired,area),desired))

func _activate(id: int) -> void:
	hide()
	match id:
		SETTINGS: settings_requested.emit()
		ABOUT: about_requested.emit()
		QUIT: quit_requested.emit()
