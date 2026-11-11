extends SceneTree
const Policy = preload("res://resize_policy.gd")

func _initialize() -> void:
	var failures: Array[String] = []
	for size: Vector2 in [Vector2(196,246),Vector2(360,460),Vector2(600,280),Vector2(150,600)]:
		var face := Policy.face_rect(size)
		if not is_equal_approx(face.size.x/face.size.y,180.0/230.0):
			failures.append("Face distorted: "+str(size))
		if not Policy.backing_rect(size).encloses(face):
			failures.append("Face outside backing: "+str(size))
		var points := [Vector2(16,16),Vector2(size.x-16,16),Vector2(16,size.y-16),size-Vector2(16,16)]
		var edges := [DisplayServer.WINDOW_EDGE_TOP_LEFT,DisplayServer.WINDOW_EDGE_TOP_RIGHT,DisplayServer.WINDOW_EDGE_BOTTOM_LEFT,DisplayServer.WINDOW_EDGE_BOTTOM_RIGHT]
		for i in range(4):
			if Policy.corner_edge(points[i],size) != edges[i]:
				failures.append("Wrong native edge")
			if Policy.cursor_for_edge(edges[i]) == Input.CURSOR_ARROW:
				failures.append("Missing native resize cursor")
		if Policy.corner_edge(size/2.0,size) != -1 or Policy.corner_edge(Vector2(-1,-1),size) != -1:
			failures.append("Centre/outside captured as resize")
	var result := {"type":"godot-corner-resize-policy","passed":failures.is_empty(),"layouts":4,"failures":failures,"visibleControlsAdded":false,"scope":"Geometry and native-edge selection only; real pointer/compositor resizing remains a human check."}
	print(JSON.stringify(result))
	quit(0 if failures.is_empty() else 1)
