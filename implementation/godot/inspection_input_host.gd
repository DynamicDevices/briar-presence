extends "res://study.gd"
## Headless test double: exercise actual input routing without native operations.
var inspections := 0
var drags := 0
var resizes := 0
var menus := 0

func _ready() -> void:
	set_process(false)
	add_child(_visual)

func _show_inspection() -> void:
	inspections += 1

func _show_context_menu(_point: Vector2i) -> void:
	_press_pending = false
	menus += 1

func _begin_face_drag() -> void:
	drags += 1

func _begin_corner_resize(_edge: int) -> void:
	resizes += 1
