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
	# Isolate resizing from model updates to prove cached vectors are reused.
	host.set_process(false)
	var initial_draws: int = host._visual.draw_count
	for step in range(16):
		root.size = Vector2i(380+step*20,490+step*25)
		await RenderingServer.frame_post_draw
		var image := root.get_texture().get_image()
		if image.get_pixel(image.get_width()/2,image.get_height()/2).a < 0.8:
			failures.append("Clear backing at step "+str(step))
		if not host._visual.displayed_size().is_equal_approx(host._face_rect.size):
			failures.append("Stale light layout at step "+str(step))
	var resize_rebuilds: int = host._visual.draw_count-initial_draws
	if resize_rebuilds != 0:
		failures.append("Resize rebuilt vector commands")
	var output := ProjectSettings.globalize_path("res://../test-artifacts/")
	if root.get_texture().get_image().save_png(output.path_join("godot-retained-resize.png")) != OK:
		failures.append("Could not capture retained vectors")
	host._visual.set_scene(host._visual._scene,host._face_rect.size,1.6,1.2)
	await RenderingServer.frame_post_draw
	if host._visual.scale != Vector2.ONE or host._visual.draw_count != initial_draws+1:
		failures.append("Fresh model scene did not restore native-size drawing")
	if root.get_texture().get_image().save_png(output.path_join("godot-refreshed-resize.png")) != OK:
		failures.append("Could not capture refreshed vectors")
	var result := {"type":"godot-resize-redraw","passed":failures.is_empty(),"failures":failures,"resizeSteps":16,"presentationCap":Engine.max_fps,"resizeVectorRebuilds":resize_rebuilds,"rendererSha256":FileAccess.get_sha256("res://light_scene.gd"),"hostSha256":FileAccess.get_sha256("res://study.gd"),"scope":"Model paused only in this test: native resize backing coverage, vector reuse, current geometry and fresh-scene reset. Not compositor intermediate buffers or a human corner-drag check."}
	var file := FileAccess.open(ProjectSettings.globalize_path("res://../test-artifacts/godot-resize-redraw.json"),FileAccess.WRITE)
	if file == null:
		quit(1)
		return
	file.store_string(JSON.stringify(result,"\t")+"\n")
	print(JSON.stringify(result))
	quit(0 if failures.is_empty() else 1)
