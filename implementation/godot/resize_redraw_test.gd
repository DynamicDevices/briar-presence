extends SceneTree
var failures: Array[String] = []

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	if DisplayServer.get_name() == "headless":
		quit(2)
		return
	create_timer(10.0).timeout.connect(func(): quit(1))
	var host = load("res://study.tscn").instantiate()
	root.add_child(host)
	await RenderingServer.frame_post_draw
	for step in range(16):
		root.size = Vector2i(380+step*20,490+step*25)
		await RenderingServer.frame_post_draw
		var image := root.get_texture().get_image()
		if image.get_pixel(image.get_width()/2,image.get_height()/2).a < 0.8:
			failures.append("Clear backing at step "+str(step))
		if not host._visual._view_size.is_equal_approx(host._face_rect.size):
			failures.append("Stale light layout at step "+str(step))
	var result := {"type":"godot-resize-redraw","passed":failures.is_empty(),"failures":failures,"resizeSteps":16,"presentationCap":Engine.max_fps,"processFrames":host._frames,"modelSamples":host._samples,"scope":"Programmatic native resizing: rendered backing coverage and fresh light geometry. Not compositor intermediate buffers or a human corner-drag check."}
	var file := FileAccess.open(ProjectSettings.globalize_path("res://../test-artifacts/godot-resize-redraw.json"),FileAccess.WRITE)
	if file == null:
		quit(1)
		return
	file.store_string(JSON.stringify(result,"\t")+"\n")
	print(JSON.stringify(result))
	quit(0 if failures.is_empty() else 1)
