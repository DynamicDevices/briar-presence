extends RefCounted
## Native-corner hit testing and aspect-preserving content layout. No controls.
const GUTTER := 8.0
const REFERENCE_SIZE := Vector2(180,230)

static func backing_rect(window_size: Vector2) -> Rect2:
	return Rect2(Vector2(GUTTER,GUTTER),Vector2(maxf(1.0,window_size.x-GUTTER*2.0),maxf(1.0,window_size.y-GUTTER*2.0)))

static func face_rect(window_size: Vector2) -> Rect2:
	var available := backing_rect(window_size).size
	var scale := minf(available.x/REFERENCE_SIZE.x,available.y/REFERENCE_SIZE.y)
	var size := REFERENCE_SIZE*scale
	return Rect2((window_size-size)/2.0,size)

static func corner_edge(point: Vector2, window_size: Vector2) -> int:
	if not Rect2(Vector2.ZERO,window_size).has_point(point):
		return -1
	var rect := backing_rect(window_size)
	var reach := minf(24.0,minf(rect.size.x,rect.size.y)/4.0)
	var left := point.x <= rect.position.x+reach
	var right := point.x >= rect.end.x-reach
	var top := point.y <= rect.position.y+reach
	var bottom := point.y >= rect.end.y-reach
	if left and top:
		return DisplayServer.WINDOW_EDGE_TOP_LEFT
	if right and top:
		return DisplayServer.WINDOW_EDGE_TOP_RIGHT
	if left and bottom:
		return DisplayServer.WINDOW_EDGE_BOTTOM_LEFT
	if right and bottom:
		return DisplayServer.WINDOW_EDGE_BOTTOM_RIGHT
	return -1

static func cursor_for_edge(edge: int) -> int:
	if edge == DisplayServer.WINDOW_EDGE_TOP_LEFT or edge == DisplayServer.WINDOW_EDGE_BOTTOM_RIGHT:
		return Input.CURSOR_FDIAGSIZE
	if edge == DisplayServer.WINDOW_EDGE_TOP_RIGHT or edge == DisplayServer.WINDOW_EDGE_BOTTOM_LEFT:
		return Input.CURSOR_BDIAGSIZE
	return Input.CURSOR_ARROW
