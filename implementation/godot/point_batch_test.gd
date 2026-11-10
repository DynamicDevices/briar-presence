extends SceneTree
const Presence = preload("res://presence.gd")
const Batch = preload("res://point_batch.gd")

func _initialize() -> void:
	var failures: Array[String] = []
	var instances := 0
	var model := Presence.new(0x5eed1234)
	for state: String in Presence.STATES:
		var scene := model.sample({"time":7.0,"state":state,"reducedMotion":false})
		var buffer := Batch.build(scene,Vector2(180,230),1.6,1.2)
		var index := 0
		for point: Dictionary in scene["lights"]:
			var opacity := minf(1.0,point["opacity"]*1.2)
			var layers: Array = [[4.0,.06],[1.0,1.0]] if point["halo"] else [[1.0,1.0]]
			for layer: Array in layers:
				var radius: float = point["radius"]*180.0*1.6*layer[0]
				var expected := PackedFloat32Array([radius,0,0,point["x"]*180.0,0,radius,0,point["y"]*230.0,point["color"][0]/255.0,point["color"][1]/255.0,point["color"][2]/255.0,opacity*layer[1]])
				if buffer.slice(index,index+12) != expected:
					failures.append("Changed point/halo transform, colour, opacity or ordering")
				index += 12
				instances += 1
		if index != buffer.size():
			failures.append("Instance count differs")
	print(JSON.stringify({"type":"godot-point-batch","passed":failures.is_empty(),"states":7,"instances":instances,"failures":failures.slice(0,5),"scope":"Packed data matches the float32 circle inputs. Shader edge coverage and actual rendering need separate checks."}))
	quit(0 if failures.is_empty() else 1)
