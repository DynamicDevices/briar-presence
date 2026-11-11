extends RefCounted
## Use the host's usable coordinate space; multiplying DPI again double-scales
## some desktops. Fractions also work for high-resolution and portrait screens.
const DEFAULT_HEIGHT_FRACTION := 0.30
const GUTTER := 16.0
const FACE_ASPECT := 180.0/230.0

static func window_size(usable: Vector2i, height_fraction: float = DEFAULT_HEIGHT_FRACTION) -> Vector2i:
	if usable.x <= 0 or usable.y <= 0:
		return Vector2i(196,246)
	var maximum_height := float(usable.y)*0.85
	var height := clampf(float(usable.y)*height_fraction,minf(246.0,maximum_height),maximum_height)
	var width := (height-GUTTER)*FACE_ASPECT+GUTTER
	var maximum_width := float(usable.x)*0.80
	if width > maximum_width:
		width = maximum_width
		height = maxf(1.0,width-GUTTER)/FACE_ASPECT+GUTTER
	return Vector2i(maxi(1,roundi(width)),maxi(1,roundi(height)))

static func fit_position(position: Vector2i, size: Vector2i, area: Rect2i) -> Vector2i:
	return Vector2i(clampi(position.x,area.position.x,maxi(area.position.x,area.end.x-size.x)),clampi(position.y,area.position.y,maxi(area.position.y,area.end.y-size.y)))

static func settings_scale(usable: Vector2i) -> float:
	var comfortable := clampf(float(usable.y)/1080.0,0.85,2.5)
	return maxf(0.25,minf(comfortable,minf(float(usable.x-32)/400.0,float(usable.y-32)/380.0)))

static func settings_position(face: Rect2i, size: Vector2i, area: Rect2i, gap: int) -> Vector2i:
	var positions := [Vector2i(face.end.x+gap,face.position.y),Vector2i(face.position.x-size.x-gap,face.position.y),Vector2i(face.position.x,face.end.y+gap),Vector2i(face.position.x,face.position.y-size.y-gap)]
	for position: Vector2i in positions:
		if area.encloses(Rect2i(position,size)):
			return position
	return fit_position(positions[0],size,area)
