extends RefCounted
## Packed 2D instance layout: transform (8 floats), colour (4 floats).
## Preserve halo/point ordering and the renderer's display-only gain/scale.
static func build(scene: Dictionary, view_size: Vector2, point_scale: float, light_gain: float) -> PackedFloat32Array:
	var count: int = scene["lights"].size()
	for point: Dictionary in scene["lights"]:
		if point["halo"]:
			count += 1
	var buffer := PackedFloat32Array()
	buffer.resize(count*12)
	var offset := 0
	for point: Dictionary in scene["lights"]:
		var x: float = point["x"]*view_size.x
		var y: float = point["y"]*view_size.y
		var radius: float = point["radius"]*view_size.x*point_scale
		var opacity := minf(1.0,point["opacity"]*light_gain)
		if point["halo"]:
			write_instance(buffer,offset,x,y,radius*4.0,point["color"],opacity*.06)
			offset += 12
		write_instance(buffer,offset,x,y,radius,point["color"],opacity)
		offset += 12
	return buffer

static func write_instance(buffer: PackedFloat32Array, offset: int, x: float, y: float, radius: float, rgb: Array, opacity: float) -> void:
	buffer[offset] = radius
	buffer[offset+1] = 0.0
	buffer[offset+2] = 0.0
	buffer[offset+3] = x
	buffer[offset+4] = 0.0
	buffer[offset+5] = radius
	buffer[offset+6] = 0.0
	buffer[offset+7] = y
	buffer[offset+8] = rgb[0]/255.0
	buffer[offset+9] = rgb[1]/255.0
	buffer[offset+10] = rgb[2]/255.0
	buffer[offset+11] = opacity
