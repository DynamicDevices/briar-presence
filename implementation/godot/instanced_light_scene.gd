extends "res://light_scene.gd"
## Optional renderer study; never selected by the normal corner-resize preview.
const PointBatch = preload("res://point_batch.gd")
var _batch := MultiMesh.new()
var _instances := MultiMeshInstance2D.new()
var packing_usec_total := 0
var packing_count := 0

func _init() -> void:
	super()
	var mesh := QuadMesh.new()
	mesh.size = Vector2(3,3)
	_batch.transform_format = MultiMesh.TRANSFORM_2D
	_batch.use_colors = true
	_batch.mesh = mesh
	_instances.multimesh = _batch
	var shader := ShaderMaterial.new()
	shader.shader = preload("res://point_material.gdshader")
	_instances.material = shader
	add_child(_instances)

func set_scene(value: Dictionary, view_size: Vector2, point_scale: float = 1.0, light_gain: float = 1.0) -> void:
	super.set_scene(value,view_size,point_scale,light_gain)
	var started := Time.get_ticks_usec()
	var buffer := PointBatch.build(value,view_size,point_scale,light_gain)
	var count: int = buffer.size()/12
	if _batch.instance_count != count:
		_batch.instance_count = count
	_batch.buffer = buffer
	packing_usec_total += Time.get_ticks_usec()-started
	packing_count += 1

func _draw() -> void:
	if _scene.is_empty():
		return
	var started := Time.get_ticks_usec()
	for glow: Dictionary in _scene["glows"]:
		var center := Vector2(glow["x"]*_view_size.x,glow["y"]*_view_size.y)
		var radii := Vector2(glow["rx"]*_view_size.x,glow["ry"]*_view_size.y)
		draw_texture_rect(_glow_texture,Rect2(center-radii,radii*2.0),false,tint(glow["color"],glow["opacity"]))
	draw_usec_total += Time.get_ticks_usec()-started
	draw_count += 1
