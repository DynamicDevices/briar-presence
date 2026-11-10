extends RefCounted
## Pure behaviour port. No nodes, display, wall clock, filesystem or live input.
## JavaScript core/presence.mjs remains the reference; compare shared fixtures.

const STATES := ["quiet", "attending", "working", "concern", "urgent", "waiting", "unknown"]
const CLOUDS := [[-.43,-.59,.13,.16],[-.04,-.77,.13,.13],[.35,-.43,.12,.17],[-.19,-.17,.18,.16],[-.48,.17,.12,.17],[.12,.20,.15,.13],[-.13,.61,.14,.16],[.43,.61,.10,.14],[.03,.89,.09,.10]]
const ABSTRACT_FACE := [[-.31,-.33,.19,.045],[.18,-.36,.15,.04],[.40,-.12,.07,.13],[-.04,-.03,.045,.13],[-.37,.17,.12,.11],[.27,.19,.11,.10],[-.17,.44,.12,.045],[.14,.43,.10,.04],[.01,.65,.11,.06]]
var _seed: int
var _state := "quiet"
var _reduced_motion := false
var _points: Array = []
var _motion: Array = []
var _gatherings: Array = []

func _init(initial_seed: int) -> void:
	assert(initial_seed >= 0 and initial_seed <= 4294967295, "A uint32 seed is required")
	_seed = initial_seed
	for group in range(9):
		for n in range(130):
			_points.append({"group":group,"x":_normal(),"y":_normal(),"r":.35+_random()*.85,"a":.25+_random()*.65,"phase":_random()*TAU,"white":_random()>.88,"key":_random()*10000.0,"speed":.35+_random()*.55,"travel":.65+_random()*.75})
	for group in range(9):
		_motion.append({"phase":_random()*TAU,"speed":.55+_random()*.35,"spread":.11+_random()*.04})
	_gatherings.append({"start":1.5,"duration":8.0+_random()*3.0,"strength":.8+_random()*.15})

func _random() -> float:
	# int64 multiplication is exact here; mask reproduces Math.imul uint32 wrap.
	_seed = (_seed * 1664525 + 1013904223) & 0xffffffff
	return (float(_seed)+.5)/4294967296.0

func _normal() -> float:
	return sqrt(-2.0*log(_random()))*cos(TAU*_random())

func _frozen() -> bool:
	return _reduced_motion or _state == "unknown" or _state == "waiting"

func _mix(a: float, b: float, amount: float) -> float:
	return a+(b-a)*amount

func _ease(value: float) -> float:
	var bounded := clampf(value,0.0,1.0)
	return bounded*bounded*(3.0-2.0*bounded)

func _envelope(t: float, a: float, b: float, c: float, d: float) -> float:
	return _ease((t-a)/(b-a))*(1.0-_ease((t-c)/(d-c)))

func _waypoint(n: float, key: float) -> float:
	var value := sin(n*127.1+key*311.7)*43758.5453
	return (value-floor(value))*2.0-1.0

func _wander(t: float, key: float) -> float:
	var cell: float = floor(t)
	return _mix(_waypoint(cell,key),_waypoint(cell+1.0,key),_ease(t-cell))

func _particle_position(point: Dictionary, cluster: Array, t: float, move: float, face: float) -> Array:
	var freedom := move*(1.0-face*.65)
	var q: float = t*point["speed"]
	var dx: float = (_wander(q,point["key"])*.075+_wander(q*.47,point["key"]+17.0)*.055)*point["travel"]*freedom
	var dy: float = (_wander(q*.83,point["key"]+41.0)*.075+_wander(q*.39,point["key"]+73.0)*.055)*point["travel"]*freedom
	return [(cluster[0]+point["x"]*cluster[2]+dx)*120.0,(cluster[1]+point["y"]*cluster[3]+dy)*165.0]

func _face_blend(t: float) -> float:
	var last: Dictionary = _gatherings[-1]
	while t > last["start"]+last["duration"]:
		last = {"start":last["start"]+last["duration"]+4.0+_random()*7.0,"duration":7.0+_random()*5.0,"strength":.7+_random()*.25}
		_gatherings.append(last)
	for gathering: Dictionary in _gatherings:
		if t <= gathering["start"]+gathering["duration"]:
			var u: float = (t-gathering["start"])/gathering["duration"]
			return _envelope(u,0.0,.32,.58,1.0)*gathering["strength"]
	return 0.0

func _layout(group: int, t: float, face: float) -> Array:
	var cluster: Array = []
	for i in range(4):
		cluster.append(_mix(CLOUDS[group][i],ABSTRACT_FACE[group][i],face))
	if not _frozen():
		var motion: Dictionary = _motion[group]
		var phase: float = t*motion["speed"]+motion["phase"]
		cluster[0] += motion["spread"]*(sin(phase)+.35*sin(phase*.71+motion["phase"]))
		cluster[1] += motion["spread"]*(cos(phase*.83)+.3*sin(phase*1.17))
		cluster[0] += .035*_wander(t*.31,motion["phase"]+100.0)
		cluster[1] += .035*_wander(t*.27,motion["phase"]+200.0)
		cluster[2] *= 1.0+.18*_wander(t*.3,motion["phase"]+300.0)
		cluster[3] *= 1.0+.15*_wander(t*.37,motion["phase"]+400.0)
	if _state == "attending":
		cluster[0] *= .78
		cluster[1] *= .86
	if _state == "urgent":
		cluster[0] *= .80
		cluster[1] *= .82
		cluster[2] *= .8
		cluster[3] *= .8
	if _state == "working":
		cluster[0] += .04*sin(t*.19+group)
		cluster[1] += .025*cos(t*.15+group)
	return cluster

func _tint(group: int, white: bool = false) -> Array:
	var rgb := [203,236,255] if white else [87,181,250]
	if _state == "concern" and (group == 5 or group == 7):
		rgb = [255,230,177] if white else [240,174,78]
	if _state == "urgent":
		rgb = [255,179,190] if white else [245,84,110]
	if _state == "unknown":
		rgb = [105,113,123]
	return rgb

func sample(input: Dictionary) -> Dictionary:
	if not input.has_all(["time","state","reducedMotion"]):
		push_error("Missing presence sample fields")
		return {}
	if not (input["time"] is float or input["time"] is int) or not is_finite(float(input["time"])) or input["time"] < 0 or not STATES.has(input["state"]) or not input["reducedMotion"] is bool:
		push_error("Invalid presence sample")
		return {}
	_state = input["state"]
	_reduced_motion = input["reducedMotion"]
	var t: float = 0.0 if _frozen() else float(input["time"])
	var face := 0.0 if _frozen() else _face_blend(t)
	var dim := .25 if _state == "unknown" else 1.0
	var positions: Array = []
	var glows: Array = []
	for group in range(9):
		var cluster := _layout(group,t,face)
		positions.append(cluster)
		glows.append({"x":(180.0+cluster[0]*120.0)/360.0,"y":(224.0+cluster[1]*165.0)/460.0,"rx":cluster[2]*120.0*3.5/360.0,"ry":cluster[3]*165.0*3.5/460.0,"color":_tint(group),"opacity":dim})
	var lights: Array = []
	for point: Dictionary in _points:
		var position := _particle_position(point,positions[point["group"]],t,0.0 if _frozen() else 1.0,face)
		var fade := clampf((172.0-absf(position[0]))/35.0,0.0,1.0)*clampf((210.0-absf(position[1]))/35.0,0.0,1.0)
		lights.append({"x":(180.0+position[0])/360.0,"y":(224.0+position[1])/460.0,"radius":point["r"]/360.0,"color":_tint(point["group"],point["white"]),"opacity":point["a"]*dim*fade,"halo":point["phase"]>5.9})
	return {"version":1,"aspect":360.0/460.0,"state":_state,"time":input["time"],"glows":glows,"lights":lights}
