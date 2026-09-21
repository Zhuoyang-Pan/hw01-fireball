#version 300 es
precision highp float;
precision highp int;

uniform vec4 u_Color;      // hot color, the fire itself
uniform vec4 u_CoolColor;  // cool color, the crust between the flames
uniform vec4 u_CamPos;
uniform float u_Time;
uniform float u_NoiseScale;
uniform int   u_Octaves;

in vec4 fs_Pos;
in vec4 fs_WorldPos;
in vec4 fs_Nor;
in vec4 fs_LightVec;
in vec4 fs_Col;
in float fs_Heat;
in float fs_Burst;

out vec4 out_Col;

//#include "toolbox.glsl"
//#include "noise.glsl"

void main()
{
    vec3 p = fs_Pos.xyz;

    // A second, finer fbm layer for color only: soot drifting across the
    // surface independently of the displacement.
    vec3 q = p * (u_NoiseScale * 1.7) + vec3(0.0, -u_Time * 0.75, u_Time * 0.20);
    float soot = fbm3(q, min(u_Octaves, 4)) * 0.5 + 0.5;

    // gain steepens the middle of the ramp so crust and fire meet at a crisp
    // edge. The two waves keep the surface flickering even when it is still.
    float flicker = 0.06 * sin(u_Time * 9.0 + p.y * 4.0)
                  + 0.04 * triangleWave(u_Time, 1.7, 1.0);
    float heat = clamp(0.5 + 0.85 * (gain(0.60, fs_Heat) - 0.5)
                       + 0.30 * (soot - 0.5)
                       + flicker + 0.15 * fs_Burst, 0.0, 1.0);

    vec3 crust = u_CoolColor.rgb * 0.16;
    vec3 body  = u_CoolColor.rgb;
    vec3 hot   = u_Color.rgb;
    vec3 core  = mix(u_Color.rgb, vec3(1.0, 0.97, 0.85), 0.60);

    // four stop gradient, all of it off the vertex displacement
    vec3 albedo = mix(crust, body, smoothstep(0.18, 0.50, heat));
    albedo = mix(albedo, hot, smoothstep(0.55, 0.82, heat));
    albedo = mix(albedo, core, bias(0.40, smoothstep(0.90, 1.0, heat)));

    // pulse picks a thin band at the crust/fire boundary and lights it
    // white-hot, which reads as cracks opening up.
    float seam = pulse(0.52, 0.05, heat);
    albedo = mix(albedo, core, seam * 0.55);

    vec3 n = normalize(fs_Nor.xyz);
    float diffuseTerm = clamp(dot(n, normalize(fs_LightVec.xyz)), 0.0, 1.0);
    float lightIntensity = 0.70 * diffuseTerm + 0.30;

    // Rim light so the silhouette stays fiery where the surface is cold and
    // facing away from the light.
    vec3 view = normalize(u_CamPos.xyz - fs_WorldPos.xyz);
    float rim = pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 3.0);

    vec3 emissive = hot * (0.35 * heat * heat * heat)
                  + core * seam * 0.25
                  + hot * rim * (0.35 + 0.5 * fs_Burst);

    out_Col = vec4(albedo * lightIntensity + emissive, 1.0);
}
