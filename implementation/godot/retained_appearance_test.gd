extends SceneTree
## Direct draw API reference from the pre-retained renderer; no live input.
class DirectReference extends Node2D:
	var scene: Dictionary
	var view_size: Vector2
	var glow_texture: Texture2D
	func tint(rgb: Array, opacity: float) -> Color:
		return Color(rgb[0]/255.0,rgb[1]/255.0,rgb[2]/255.0,opacity)
	func _draw() -> void:
		for glow: Dictionary in scene["glows"]:
			var center := Vector2(glow["x"]*view_size.x,glow["y"]*view_size.y)
			var radii := Vector2(glow["rx"]*view_size.x,glow["ry"]*view_size.y)
			draw_texture_rect(glow_texture,Rect2(center-radii,radii*2.0),false,tint(glow["color"],glow["opacity"]))
		for light: Dictionary in scene["lights"]:
			var center := Vector2(light["x"]*view_size.x,light["y"]*view_size.y)
			var radius: float = light["radius"]*view_size.x*1.6
			var opacity := minf(1.0,light["opacity"]*1.2)
			if light["halo"]:
				draw_circle(center,radius*4.0,tint(light["color"],opacity*.06),true,-1.0,true)
			draw_circle(center,radius,tint(light["color"],opacity),true,-1.0,true)

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
	host.set_process(false)
	var reference := DirectReference.new()
	reference.visible = false
	reference.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	root.add_child(reference)
	var scene: Dictionary = host._model.sample({"time":17.3,"state":"quiet","reducedMotion":false})
	var output := ProjectSettings.globalize_path("res://../test-artifacts/")
	for size: Vector2i in [Vector2i(400,520),Vector2i(960,1240)]:
		root.size = size
		await RenderingServer.frame_post_draw
		host._visual.show()
		reference.hide()
		host._visual.set_scene(scene,host._face_rect.size,1.6,1.2)
		await RenderingServer.frame_post_draw
		if root.get_texture().get_image().save_png(output.path_join("godot-retained-appearance-"+str(size.x)+".png")) != OK:
			quit(1)
			return
		host._visual.hide()
		reference.scene = scene
		reference.view_size = host._face_rect.size
		reference.glow_texture = host._visual._glow_texture
		reference.position = host._face_rect.position
		reference.show()
		reference.queue_redraw()
		await RenderingServer.frame_post_draw
		if root.get_texture().get_image().save_png(output.path_join("godot-direct-appearance-"+str(size.x)+".png")) != OK:
			quit(1)
			return
	reference.hide()
	host._visual.hide()
	await RenderingServer.frame_post_draw
	var backing_only := root.get_texture().get_image().get_data()
	host._visual.show()
	host._visual.set_scene({},host._face_rect.size,1.6,1.2)
	await RenderingServer.frame_post_draw
	var cleared := root.get_texture().get_image().get_data() == backing_only
	print(JSON.stringify({"type":"godot-retained-appearance-captures","passed":cleared,"emptySceneClears":cleared,"sizes":[400,960],"rendererSha256":FileAccess.get_sha256("res://light_scene.gd"),"scope":"Own viewport captures for subsequent pixel comparison against the original direct circle/texture API; empty scene must clear retained lights."}))
	if not cleared:
		quit(1)
		return
	quit(0)
