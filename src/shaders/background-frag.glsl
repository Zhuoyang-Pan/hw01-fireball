#version 300 es
precision highp float;
precision highp int;

uniform vec2 u_Dimensions;
uniform float u_Time;
uniform vec4 u_Color;      // fireball's hot color, reused for the light pool
uniform vec4 u_CoolColor;

in vec2 fs_UV;

out vec4 out_Col;

//#include "toolbox.glsl"
//#include "noise.glsl"

// Sparks rising out of frame. Each cell of the grid either holds one or it
// doesn't, and the grid scrolls upward.
float embers(vec2 uv, float t) {
    float acc = 0.0;
    for (int i = 0; i < 3; ++i) {
        float fi = float(i);
        float scale = 3.0 + 2.5 * fi;
        vec2 g = uv * scale + vec2(0.7 * fi, -t * (0.35 + 0.22 * fi));
        vec2 cell = floor(g);
        vec2 f = fract(g) - 0.5;

        vec3 h = random3(vec3(cell, fi));
        float alive = step(0.80, random1(vec3(cell, fi + 17.0)));
        float size = 0.020 + 0.025 * abs(h.z);
        float d = length(f - h.xy * 0.32);
        acc += alive * smoothstep(size, 0.0, d) / (1.0 + fi);
    }
    return acc;
}

void main()
{
    vec2 uv = fs_UV;
    uv.x *= u_Dimensions.x / max(1.0, u_Dimensions.y);
    float r = length(uv);

    // Nebula: fbm whose sample point is warped by more fbm, which pulls the
    // round blobs out into streaks.
    vec3 q = vec3(uv * 1.1, u_Time * 0.035);
    vec3 warp = vec3(fbm3(q + vec3(11.3,  5.7, 2.1), 3),
                     fbm3(q + vec3(41.7, 19.1, 8.3), 3), 0.0);
    float clouds = fbm3(q + 1.4 * warp, 5) * 0.5 + 0.5;

    vec3 col = mix(vec3(0.015, 0.016, 0.035), u_CoolColor.rgb * 0.32,
                   bias(0.30, clouds));

    // Pool of light around the fireball, plus a ring further out so the
    // falloff isn't just a radial gradient.
    col += u_Color.rgb * 0.16 * (1.0 - smoothstep(0.0, 1.6, r));
    col += u_Color.rgb * 0.08 * pulse(0.62, 0.45, r);

    // Stars, one candidate per cell, twinkling out of phase with each other.
    vec2 g = uv * 42.0;
    vec2 cell = floor(g);
    vec3 h = random3(vec3(cell, 3.0));
    if (h.z > 0.90) {
        float d = length(fract(g) - 0.5 - h.xy * 0.34);
        float twinkle = 0.45 + 0.55 * sin(u_Time * 2.5 + h.x * 20.0);
        col += vec3(0.88, 0.92, 1.0) * smoothstep(0.07, 0.0, d) * twinkle;
    }

    col += u_Color.rgb * embers(uv, u_Time) * 0.85;

    // vignette, so the corners fall away
    col *= 1.0 - 0.40 * smoothstep(0.55, 1.9, r);

    out_Col = vec4(col, 1.0);
}
