extends SceneTree
const Presence = preload("res://presence.gd")
var failures: Array[String] = []
var checks := 0

func check(value: bool, label: String) -> void:
	checks += 1
	if not value:
		failures.append(label)

func _initialize() -> void:
	var good := {"time":4.0,"state":"quiet","reducedMotion":false}
	for seed: Variant in [null,true,false,"1",{},[],-1,4294967296,0.5,INF,NAN]:
		var invalid = Presence.new(seed)
		check(not invalid.validation_error.is_empty(),"seed rejected: "+str(seed))
		check(invalid.sample(good).is_empty(),"invalid seed cannot animate: "+str(seed))
	for seed: Variant in [0,4294967295,0.0,4294967295.0]:
		var valid = Presence.new(seed)
		check(valid.validation_error.is_empty() and not valid.sample(good).is_empty(),"valid seed: "+str(seed))
	var model = Presence.new(0x5eed1234)
	var expected: Dictionary = model.sample(good)
	var invalid_inputs: Array = [null,true,0,"quiet",[],{},
		{"time":0,"state":"quiet"},
		{"time":-1,"state":"quiet","reducedMotion":false},
		{"time":INF,"state":"quiet","reducedMotion":false},
		{"time":NAN,"state":"quiet","reducedMotion":false},
		{"time":true,"state":"quiet","reducedMotion":false},
		{"time":"0","state":"quiet","reducedMotion":false},
		{"time":0,"state":"healthy","reducedMotion":false},
		{"time":0,"state":null,"reducedMotion":false},
		{"time":0,"state":[],"reducedMotion":false},
		{"time":0,"state":"quiet","reducedMotion":0}]
	for input: Variant in invalid_inputs:
		check(model.sample(input).is_empty(),"invalid sample rejected: "+str(input))
		check(not model.validation_error.is_empty(),"explicit rejection reason")
		check(model.sample(good) == expected and model.validation_error.is_empty(),"valid recovery without mutation")
	for state: String in Presence.STATES:
		check(model.sample({"time":0,"state":state,"reducedMotion":true})["state"] == state,"supported state: "+state)
	print(JSON.stringify({"type":"godot-input-validation","passed":failures.is_empty(),"checks":checks,"failures":failures,"scope":"Runtime seed and sample rejection, explicit errors and recovery; no transport or live producer."}))
	quit(0 if failures.is_empty() else 1)
