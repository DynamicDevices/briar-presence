shader_type canvas_item;
render_mode unshaded;

void fragment() {
	vec2 point = (UV - vec2(0.5)) * 3.0;
	float distance_to_center = length(point);
	float edge_width = max(fwidth(distance_to_center), 0.001);
	float coverage = 1.0 - smoothstep(1.0 - edge_width, 1.0 + edge_width, distance_to_center);
	COLOR.a *= coverage;
}
