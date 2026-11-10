extends Node2D
## Renderer only: consumes the same normalized scene as the Canvas adapter.
var _scene: Dictionary = {}
var _view_size := Vector2(360,460)
var _point_scale := 1.0
var _light_gain := 1.0
var _glow_texture: GradientTexture2D
var draw_usec_total := 0
var draw_count := 0

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
	queue_redraw()

func tint(rgb: Array, opacity: float) -> Color:
	return Color(rgb[0]/255.0,rgb[1]/255.0,rgb[2]/255.0,opacity)

func _draw() -> void:
	if _scene.is_empty():
		return
	var started := Time.get_ticks_usec()
	for glow: Dictionary in _scene["glows"]:
		var center := Vector2(glow["x"]*_view_size.x,glow["y"]*_view_size.y)
		var radii := Vector2(glow["rx"]*_view_size.x,glow["ry"]*_view_size.y)
		draw_texture_rect(_glow_texture,Rect2(center-radii,radii*2.0),false,tint(glow["color"],glow["opacity"]))
	for light: Dictionary in _scene["lights"]:
		var center := Vector2(light["x"]*_view_size.x,light["y"]*_view_size.y)
		var radius: float = light["radius"]*_view_size.x*_point_scale
		var opacity := minf(1.0,light["opacity"]*_light_gain)
		if light["halo"]:
			draw_circle(center,radius*4.0,tint(light["color"],opacity*.06),true,-1.0,true)
		draw_circle(center,radius,tint(light["color"],opacity),true,-1.0,true)
	draw_usec_total += Time.get_ticks_usec()-started
	draw_count += 1
