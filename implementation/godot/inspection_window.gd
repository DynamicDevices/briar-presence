extends Window
## On-demand read-only inspection of the same synthetic state as the face.
const Model = preload("res://inspection_model.gd")
const Layout = preload("res://inspection_layout.gd")
const Sizing = preload("res://display_sizing.gd")
signal settings_requested
var selected_key := ""
var ui_scale := 1.0
var _semantic: Dictionary = {}
var _fingerprint := ""
var _face: Window
var _panel: PanelContainer
var _column: VBoxContainer
var _tasks: VBoxContainer
var _details: VBoxContainer
var _summary: Label
var _status: Label
var _overview: Button
var _rows: Array[Button] = []
var _last_face_rect := Rect2i()
var _last_area := Rect2i()

func _ready() -> void:
	title = "Briar · current work (synthetic)"
	borderless = true
	transparent = true
	transparent_bg = true
	unresizable = true
	transient = true
	exclusive = false
	content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	close_requested.connect(close_inspection)

func _label(text: String, parent: Node, large: bool = false) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size",roundi((19 if large else 14)*ui_scale))
	label.add_theme_color_override("font_color",Color("20364a"))
	parent.add_child(label)
	return label

func _button(text: String, parent: Node) -> Button:
	var button := Button.new()
	button.text = text
	button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	button.alignment = HORIZONTAL_ALIGNMENT_LEFT
	button.custom_minimum_size.y = roundi(38*ui_scale)
	button.add_theme_font_size_override("font_size",roundi(14*ui_scale))
	for state: String in ["font_color","font_hover_color","font_pressed_color","font_focus_color"]:
		button.add_theme_color_override(state,Color("20364a"))
	for state: String in ["normal","hover","pressed","focus"]:
		var style := StyleBoxFlat.new()
		style.bg_color = Color("dce8ef") if state == "normal" else Color("cbdfe9")
		style.set_corner_radius_all(roundi(9*ui_scale))
		style.set_content_margin_all(10*ui_scale)
		if state == "focus":
			style.bg_color = Color.TRANSPARENT
			style.border_color = Color("376784")
			style.set_border_width_all(2)
		button.add_theme_stylebox_override(state,style)
	parent.add_child(button)
	return button

func _build() -> void:
	if is_instance_valid(_panel):
		_panel.free()
	_rows.clear()
	_panel = PanelContainer.new()
	_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var backing := StyleBoxFlat.new()
	backing.bg_color = Color("edf2f5")
	backing.set_corner_radius_all(roundi(22*ui_scale))
	backing.set_content_margin_all(18*ui_scale)
	_panel.add_theme_stylebox_override("panel",backing)
	add_child(_panel)
	_column = VBoxContainer.new()
	_column.add_theme_constant_override("separation",roundi(10*ui_scale))
	_panel.add_child(_column)
	_label("Briar · current work",_column,true)
	_status = _label("Synthetic preview — no live harness connected",_column)
	_summary = _label("",_column)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_column.add_child(scroll)
	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation",roundi(12*ui_scale))
	scroll.add_child(content)
	_tasks = VBoxContainer.new()
	content.add_child(_tasks)
	_details = VBoxContainer.new()
	_details.add_theme_constant_override("separation",roundi(12*ui_scale))
	content.add_child(_details)
	var actions := HBoxContainer.new()
	_column.add_child(actions)
	_overview = _button("All work",actions)
	_overview.pressed.connect(func(): select_task(""))
	var settings := _button("Display settings",actions)
	settings.pressed.connect(func(): hide(); settings_requested.emit())
	var close_button := _button("Close",actions)
	close_button.pressed.connect(close_inspection)
	_label("Read-only preview · selection stays local\nAcknowledged means seen, not resolved.",_column)

func set_semantic(semantic: Dictionary) -> void:
	var fingerprint := JSON.stringify(semantic)
	if fingerprint == _fingerprint:
		return
	_semantic = semantic.duplicate(true)
	_fingerprint = fingerprint
	if is_instance_valid(_tasks):
		_render()

func select_task(key: String) -> void:
	selected_key = key
	_render()
	_overview.grab_focus()

func _clear(parent: Node) -> void:
	for child: Node in parent.get_children():
		# A clicked row may be emitting its signal; retire it after dispatch.
		parent.remove_child(child)
		child.queue_free()

func _render() -> void:
	var focused_key := ""
	for row: Button in _rows:
		if is_instance_valid(row) and row.has_focus():
			focused_key = row.get_meta("task_key","")
	_clear(_tasks)
	_clear(_details)
	_rows.clear()
	var model := Model.project(_semantic,selected_key)
	if not model.ok:
		_status.text = "Source unavailable — status unknown"
		_summary.text = str(model.reason)
		return
	_status.text = "Source unavailable — status unknown\nSynthetic preview — old facts are not current status" if model.unknown else "Synthetic preview — no live harness connected"
	_summary.text = "%s tasks · %s unresolved concerns · %s response requests" % [model.counts.work,model.counts.concerns,model.counts.requests]
	for task: Dictionary in model.tasks:
		var row := _button("%s%s\n%s · %s\n%s concerns · %s requests" % ["Selected · " if task.key == selected_key else "",task.label,task.lifecycle,task.get("freshness","unknown"),task.concerns.size(),task.requests.size()],_tasks)
		row.set_meta("task_key",task.key)
		row.tooltip_text = "%s / %s · Inspect locally; shared focus is unchanged" % [task.producerId,task.id]
		row.pressed.connect(select_task.bind(task.key))
		_rows.append(row)
		if task.key == focused_key:
			row.grab_focus()
	if model.selected != null:
		_label(str(model.selected.label),_details,true)
		if model.selected.has("result"):
			_label("Work result: %s\n%s\nA work result does not resolve a concern." % [model.selected.result.get("outcome","unknown"),model.selected.result.get("summary","")],_details)
		for concern: Dictionary in model.details.concerns:
			_label(Model.concern_text(concern),_details)
		for request: Dictionary in model.details.requests:
			_label(Model.request_text(request),_details)
		if model.details.concerns.is_empty() and model.details.requests.is_empty():
			_label("No concern or response request is attached to this task.",_details)
	elif not selected_key.is_empty():
		_label("Selected task is no longer in this view. Choose another task or All work.",_details)
	else:
		_label("Choose a task for impact, evidence and response details.",_details)
	for concern: Dictionary in model.unassignedConcerns:
		_label("Concern not attached to a listed task\n"+Model.concern_text(concern),_details)
	for request: Dictionary in model.unassignedRequests:
		_label("Request not attached to a listed task\n"+Model.request_text(request),_details)

func show_inspection(semantic: Dictionary, face: Window) -> bool:
	_face = face
	var area := DisplayServer.screen_get_usable_rect(face.current_screen)
	ui_scale = Sizing.settings_scale(area.size)
	var placement := Layout.plan(Rect2i(face.position,face.size),area,ui_scale)
	if not placement.ok:
		print(JSON.stringify({"type":"inspection-no-space","reason":placement.reason}))
		return false
	_build()
	_fingerprint = ""
	set_semantic(semantic)
	current_screen = face.current_screen
	size = placement.rect.size
	position = placement.rect.position
	_last_face_rect = Rect2i(face.position,face.size)
	_last_area = area
	show()
	grab_focus()
	_overview.grab_focus()
	return true

func follow_face() -> void:
	if not visible or not is_instance_valid(_face):
		return
	var area := DisplayServer.screen_get_usable_rect(_face.current_screen)
	var face_rect := Rect2i(_face.position,_face.size)
	if face_rect == _last_face_rect and area == _last_area:
		return
	var scale := Sizing.settings_scale(area.size)
	var placement := Layout.plan(face_rect,area,scale)
	if not placement.ok:
		hide()
		print(JSON.stringify({"type":"inspection-no-space","reason":placement.reason}))
		return
	if not is_equal_approx(scale,ui_scale):
		ui_scale = scale
		_build()
		_render()
	current_screen = _face.current_screen
	size = placement.rect.size
	position = placement.rect.position
	_last_face_rect = face_rect
	_last_area = area

func close_inspection() -> void:
	hide()
	if is_instance_valid(_face):
		_face.grab_focus()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		close_inspection()
		set_input_as_handled()
