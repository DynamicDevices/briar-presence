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
	host._reference_frame = true
	await RenderingServer.frame_post_draw
	var samples: Array = []
	for size: Vector2i in [Vector2i(400,520),Vector2i(960,1240)]:
		root.size = size
		await RenderingServer.frame_post_draw
		await RenderingServer.frame_post_draw
		var image := root.get_texture().get_image()
		if image.get_size() != size:
			failures.append("Framebuffer does not match window size: "+str(size))
		for glow: Dictionary in host._visual._scene["glows"]:
			if host._visual._glow_texture.width < ceili(2.0*float(glow["rx"])*host._face_rect.size.x) or host._visual._glow_texture.height < ceili(2.0*float(glow["ry"])*host._face_rect.size.y):
				failures.append("Glow is stretched beyond its source resolution")
		var output := ProjectSettings.globalize_path("res://../test-artifacts/godot-fidelity-"+str(size.x)+".png")
		if image.save_png(output) != OK:
			failures.append("Could not save own viewport capture")
		samples.append({"windowSize":[root.size.x,root.size.y],"framebufferSize":[image.get_width(),image.get_height()],"contentScaleMode":root.content_scale_mode,"contentScaleFactor":root.content_scale_factor,"glowTextureSize":[host._visual._glow_texture.width,host._visual._glow_texture.height],"screenScale":DisplayServer.screen_get_scale(root.current_screen),"screenDpi":DisplayServer.screen_get_dpi(root.current_screen),"image":output})
	var result := {"type":"godot-resize-fidelity","passed":failures.is_empty(),"failures":failures,"samples":samples,"scope":"Own framebuffer dimensions and rendering resources at two sizes. Not compositor physical-pixel scaling or human visual acceptance."}
	var report := FileAccess.open(ProjectSettings.globalize_path("res://../test-artifacts/godot-resize-fidelity.json"),FileAccess.WRITE)
	if report == null:
		quit(1)
		return
	report.store_string(JSON.stringify(result,"\t")+"\n")
	print(JSON.stringify(result))
	quit(0 if failures.is_empty() else 1)
