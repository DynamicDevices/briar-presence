extends Node2D
## Renderer only: consumes the same normalized scene as the Canvas adapter.
var _scene: Dictionary = {}
var _view_size := Vector2(360,460)
var _point_scale := 1.0
var _light_gain := 1.0
var _glow_texture: GradientTexture2D
var draw_usec_total := 0
var draw_count := 0
var _retained_item: RID
var _commands_dirty := true

func _ready() -> void:
	_retained_item = RenderingServer.canvas_item_create()
	RenderingServer.canvas_item_set_parent(_retained_item,get_canvas_item())

func _notification(what: int) -> void:
	if what == NOTIFICATION_PREDELETE and _retained_item.is_valid():
		RenderingServer.free_rid(_retained_item)

func _init() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	var gradient := Gradient.new()
	gradient.offsets = PackedFloat32Array([0.0,.4,1.0])
	gradient.colors = PackedColorArray([Color(1,1,1,.24),Color(1,1,1,.08),Color(1,1,1,0)])
	_glow_texture = GradientTexture2D.new()
	_glow_texture.gradient = gradient
	_glow_texture.fill = GradientTexture2D.FILL_RADIAL
	_glow_texture.fill_from = Vector2(.5,.5)
	_glow_texture.fill_to = Vector2(1,.5)
	_glow_texture.width = 128
	_glow_texture.height = 128

func set_scene(value: Dictionary, view_size: Vector2, point_scale: float = 1.0, light_gain: float = 1.0) -> void:
	_scene = value
	_view_size = view_size
	_point_scale = point_scale
	_light_gain = light_gain
	scale = Vector2.ONE
	_commands_dirty = true
	_ensure_glow_resolution(value,view_size)
	queue_redraw()

func resize_scene(view_size: Vector2) -> void:
	if _scene.is_empty():
		return
	# Retain vector draw commands between model updates. Canvas transforms are
	# immediate: no raster screenshot and no per-resize circle reconstruction.
	_ensure_glow_resolution(_scene,view_size)
	scale = view_size/_view_size

func displayed_size() -> Vector2:
	return _view_size*scale

func _ensure_glow_resolution(value: Dictionary, view_size: Vector2) -> void:
	# Keep the soft gradient at least as detailed as its largest drawn extent.
	# Grow in powers of two, not on every pixel of a corner drag; reuse on shrink.
	var extent := Vector2(128,128)
	for glow: Dictionary in value.get("glows",[]):
		extent.x = maxf(extent.x,2.0*float(glow["rx"])*view_size.x)
		extent.y = maxf(extent.y,2.0*float(glow["ry"])*view_size.y)
	var width := nearest_po2(ceili(extent.x))
	var height := nearest_po2(ceili(extent.y))
	if width > _glow_texture.width:
		_glow_texture.width = width
	if height > _glow_texture.height:
		_glow_texture.height = height

func tint(rgb: Array, opacity: float) -> Color:
	return Color(rgb[0]/255.0,rgb[1]/255.0,rgb[2]/255.0,opacity)

func _draw() -> void:
	if not _commands_dirty:
		return
	_commands_dirty = false
	RenderingServer.canvas_item_clear(_retained_item)
	if _scene.is_empty():
		return
	var started := Time.get_ticks_usec()
	for glow: Dictionary in _scene["glows"]:
		var center := Vector2(glow["x"]*_view_size.x,glow["y"]*_view_size.y)
		var radii := Vector2(glow["rx"]*_view_size.x,glow["ry"]*_view_size.y)
		RenderingServer.canvas_item_add_texture_rect(_retained_item,Rect2(center-radii,radii*2.0),_glow_texture.get_rid(),false,tint(glow["color"],glow["opacity"]))
	for light: Dictionary in _scene["lights"]:
		var center := Vector2(light["x"]*_view_size.x,light["y"]*_view_size.y)
		var radius: float = light["radius"]*_view_size.x*_point_scale
		var opacity := minf(1.0,light["opacity"]*_light_gain)
		if light["halo"]:
			RenderingServer.canvas_item_add_circle(_retained_item,center,radius*4.0,tint(light["color"],opacity*.06),true)
		RenderingServer.canvas_item_add_circle(_retained_item,center,radius,tint(light["color"],opacity),true)
	draw_usec_total += Time.get_ticks_usec()-started
	draw_count += 1
