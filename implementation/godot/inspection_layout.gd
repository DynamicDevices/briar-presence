extends RefCounted
## Never cover the face. Return an explicit no-space result, not an overlap.
static func plan(face: Rect2i, area: Rect2i, scale: float) -> Dictionary:
	var gap := maxi(4,roundi(16*scale))
	var minimum := Vector2i(roundi(300*scale),roundi(230*scale))
	var desired := Vector2i(roundi(440*scale),roundi(580*scale))
	var candidates := [
		Rect2i(Vector2i(face.end.x+gap,area.position.y),Vector2i(maxi(0,area.end.x-face.end.x-gap),area.size.y)),
		Rect2i(area.position,Vector2i(maxi(0,face.position.x-gap-area.position.x),area.size.y)),
		Rect2i(Vector2i(area.position.x,face.end.y+gap),Vector2i(area.size.x,maxi(0,area.end.y-face.end.y-gap))),
		Rect2i(area.position,Vector2i(area.size.x,maxi(0,face.position.y-gap-area.position.y)))]
	for available: Rect2i in candidates:
		if available.size.x < minimum.x or available.size.y < minimum.y:
			continue
		var size := Vector2i(mini(desired.x,available.size.x),mini(desired.y,available.size.y))
		var position := Vector2i(clampi(face.position.x,available.position.x,available.end.x-size.x),clampi(face.position.y,available.position.y,available.end.y-size.y))
		var rect := Rect2i(position,size)
		if area.encloses(rect) and not face.intersects(rect):
			return {"ok":true,"rect":rect}
	return {"ok":false,"reason":"Move or shrink the face to leave room for work details."}
