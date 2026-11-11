extends RefCounted
## Read-only accepted-view projection. Selection never changes shared focus.

static func task_key(producer_id: String, id: String) -> String:
	return JSON.stringify([producer_id,id])

static func related_work(request: Dictionary, concerns: Array) -> Variant:
	if request.has("workId"):
		return request.workId
	for concern: Dictionary in concerns:
		if concern.producerId == request.producerId and concern.id == request.get("concernId"):
			return concern.get("workId")
	return null

static func project(semantic: Dictionary, selected: String = "") -> Dictionary:
	if semantic.get("mode") != "synthetic" or not ["unknown","working","waiting","quiet"].has(semantic.get("baseState")):
		return {"ok":false,"reason":"Accepted synthetic state required"}
	for field: String in ["work","concerns","requests"]:
		if not semantic.get(field) is Array:
			return {"ok":false,"reason":"Incomplete inspection state"}
		for record: Variant in semantic[field]:
			if not record is Dictionary:
				return {"ok":false,"reason":"Invalid inspection record"}
			for name: String in ["producerId","id"]:
				if not record.get(name) is String:
					return {"ok":false,"reason":"Missing inspection identity"}
			var names := ["label","lifecycle"] if field == "work" else ["lifecycle"] if field == "concerns" else ["state","category"]
			for name: String in names:
				if not record.get(name) is String:
					return {"ok":false,"reason":"Missing inspection label or state"}
			for name: String in ["severity","timing","result"]:
				if record.has(name) and not record[name] is Dictionary:
					return {"ok":false,"reason":"Invalid inspection detail"}
	var concerns: Array = semantic.concerns.filter(func(c: Dictionary): return c.lifecycle == "open")
	var requests: Array = semantic.requests.filter(func(r: Dictionary): return r.state == "open" and r.category != "for-awareness")
	var tasks: Array = []
	for work: Dictionary in semantic.work:
		var task := work.duplicate(true)
		task.key = task_key(work.producerId,work.id)
		task.concerns = concerns.filter(func(c: Dictionary): return c.producerId == work.producerId and c.get("workId") == work.id)
		task.requests = requests.filter(func(r: Dictionary): return r.producerId == work.producerId and related_work(r,semantic.concerns) == work.id)
		tasks.append(task)
	tasks.sort_custom(func(a: Dictionary,b: Dictionary):
		var a_needs: bool = not a.concerns.is_empty() or not a.requests.is_empty()
		var b_needs: bool = not b.concerns.is_empty() or not b.requests.is_empty()
		if a_needs != b_needs:
			return a_needs
		var compared := str(a.label).nocasecmp_to(str(b.label))
		return a.key < b.key if compared == 0 else compared < 0)
	var chosen: Variant = null
	for task: Dictionary in tasks:
		if task.key == selected:
			chosen = task
	var unassigned_concerns := concerns.filter(func(c: Dictionary):
		return not tasks.any(func(w: Dictionary): return c.producerId == w.producerId and c.get("workId") == w.id))
	var unassigned_requests := requests.filter(func(r: Dictionary):
		return not tasks.any(func(w: Dictionary): return r.producerId == w.producerId and related_work(r,semantic.concerns) == w.id))
	return {"ok":true,"tasks":tasks,"selected":chosen,"unknown":semantic.baseState == "unknown",
		"counts":{"work":tasks.size(),"concerns":concerns.size(),"requests":requests.size()},
		"unassignedConcerns":unassigned_concerns.duplicate(true),"unassignedRequests":unassigned_requests.duplicate(true),
		"details":{"concerns":semantic.concerns.filter(func(c: Dictionary): return c.producerId == chosen.producerId and c.get("workId") == chosen.id).duplicate(true),"requests":chosen.requests.duplicate(true)} if chosen != null else null}

static func concern_text(concern: Dictionary) -> String:
	var severity: Dictionary = concern.get("severity",{})
	var assessment := "Possible — not confirmed" if severity.get("assessment") == "provisional" else "Established" if severity.get("assessment") == "established" else "Unassessed"
	var seen := "Acknowledged — still open, not resolved" if concern.get("acknowledged",false) else "Not acknowledged at this revision"
	if concern.get("lifecycle") != "open":
		seen = "Explicitly resolved" if concern.get("lifecycle") == "resolved" else str(concern.get("lifecycle","unknown"))
	return "%s\n%s impact · %s\n%s\nFreshness: %s%s\nImpact: %s\nEvidence: %s" % [
		concern.get("summary","Concern"),severity.get("level","unassessed"),assessment,seen,
		concern.get("freshness","unknown")," · omitted by source" if concern.get("sourceOmitted",false) else "",
		severity.get("impact","Not supplied"),severity.get("evidence","Not supplied")]

static func request_text(request: Dictionary) -> String:
	var timing: Dictionary = request.get("timing",{})
	return "%s · %s\n%s\n%s%s" % [request.get("category","Response request"),request.get("summary",""),request.get("request","No response text supplied"),
		"Timing: %s\nIf delayed: %s" % [timing.get("basis","Not supplied"),timing.get("consequenceOfDelay","Not supplied")] if not timing.is_empty() else "No deadline claimed.",
		"\nSource lease: %s" % request.sourceLease if request.has("sourceLease") else ""]
