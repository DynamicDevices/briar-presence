extends SceneTree
const Sizing = preload("res://display_sizing.gd")
var failures: Array[String] = []

func check(value: bool, label: String) -> void:
	if not value:
		failures.append(label)

func _initialize() -> void:
	var cases := [Vector2i(1920,1080),Vector2i(2256,1504),Vector2i(3840,2160),Vector2i(1080,1920),Vector2i(800,600),Vector2i(320,240)]
	for usable: Vector2i in cases:
		var size := Sizing.window_size(usable)
		check(size.x > 0 and size.y > 0 and size.x <= usable.x and size.y <= usable.y,"bounded: "+str(usable))
		check(absf(float(size.x-16)/float(size.y-16)-180.0/230.0)<0.015,"aspect: "+str(usable))
		var area := Rect2i(Vector2i(-usable.x,40),usable)
		var fitted := Sizing.fit_position(Vector2i(99999,-99999),size,area)
		check(area.encloses(Rect2i(fitted,size)),"kept on named monitor: "+str(usable))
		var scale := Sizing.settings_scale(usable)
		var panel_size := Vector2i(roundi(400*scale),roundi(380*scale))
		check(panel_size.x <= usable.x and panel_size.y <= usable.y,"settings fit display: "+str(usable))
		var panel_position := Sizing.settings_position(Rect2i(fitted,size),panel_size,area,16)
		check(area.encloses(Rect2i(panel_position,panel_size)),"settings position fits: "+str(usable))
	check(Sizing.window_size(Vector2i(3840,2160)).y == 2*Sizing.window_size(Vector2i(1920,1080)).y,"relative size doubles with resolution")
	check(Sizing.window_size(Vector2i(2256,1504)).y > 246,"larger on high-resolution laptop")
	check(Sizing.window_size(Vector2i(3840,2160),0.45).y == 972,"manual relative size preserved")
	check(Sizing.window_size(Vector2i.ZERO) == Vector2i(196,246),"missing display fallback")
	check(Sizing.settings_scale(Vector2i(2256,1504),true) == 1.0,"Wayland logical laptop units use standard text scale")
	check(Sizing.settings_scale(Vector2i(2256,1504),false) > 1.0,"existing X11 sizing remains unchanged")
	for usable: Vector2i in cases:
		var scale := Sizing.settings_scale(usable,true)
		check(scale <= 1.0 and 400*scale <= usable.x and 380*scale <= usable.y,"Wayland logical dialog remains bounded "+str(usable))
	print(JSON.stringify({"type":"godot-display-sizing","passed":failures.is_empty(),"failures":failures,"displays":cases.size(),"defaultHeightFraction":Sizing.DEFAULT_HEIGHT_FRACTION,"scope":"Sizing policy only; real monitor movement and perceived physical size still need checking."}))
	quit(0 if failures.is_empty() else 1)
