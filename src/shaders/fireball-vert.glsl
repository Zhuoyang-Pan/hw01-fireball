#version 300 es

uniform mat4 u_Model;
uniform mat4 u_ModelInvTr;
uniform mat4 u_ViewProj;

uniform float u_Time;
uniform float u_Displace;    // amplitude of the low-frequency sinusoids
uniform float u_NoiseScale;  // frequency fed to the fBm
uniform float u_NoiseAmp;    // amplitude of the fBm detail
uniform int   u_Octaves;     // fBm octave count
uniform float u_Explode;     // strength of the explosion loop

in vec4 vs_Pos;
in vec4 vs_Nor;
in vec4 vs_Col;

out vec4 fs_Pos;      // object space, before displacement -- the noise input
out vec4 fs_WorldPos; // displaced position in world space, for the rim light
out vec4 fs_Nor;
out vec4 fs_LightVec;
out vec4 fs_Col;
out float fs_Heat;    // displacement remapped to 0-1, drives the palette
out float fs_Burst;   // position in the explosion loop

//#include "toolbox.glsl"
//#include "noise.glsl"

const vec4 lightPos = vec4(5, 5, 3, 1);
const float EPS = 0.012;
const float BURST_PERIOD = 5.0;

// The low frequency, high amplitude layer: f(x, y, z) = h, offset along the
// normal. Three sinusoids at different speeds so the lobes never line back up.
// The taper grows them upward, otherwise this is just a lumpy sphere.
float lowFreq(vec3 p) {
    float a = sin(1.9 * p.y + u_Time * 1.30);
    float b = cos(1.5 * p.x - u_Time * 0.90);
    float c = sin(1.3 * p.z + u_Time * 1.10);
    float lobes = 0.55 * a * b + 0.45 * c;
    float taper = mix(0.55, 1.45, smoothstep(-1.0, 1.0, p.y));
    return lobes * taper;
}

// Higher frequency, lower amplitude fbm on top. Walking the sample point down
// in y makes the detail crawl upward.
float detail(vec3 p) {
    vec3 q = p * u_NoiseScale + vec3(0.0, -u_Time * 0.55, u_Time * 0.12);
    return fbm3(q, u_Octaves);
}

// returns the displaced position in xyz, and the height in w for the palette
vec4 displace(vec3 p, vec3 n, float burst) {
    float h = (u_Displace * lowFreq(p) + u_NoiseAmp * detail(p))
              * (1.0 + u_Explode * burst);

    vec3 pos = p + n * (h + 0.22 * u_Explode * burst);

    // Pull the top half into a tip and pinch it in, which is what makes the
    // silhouette a teardrop. easeInOutQuad keeps the shoulder from kinking.
    float up = easeInOutQuad(clamp(p.y * 0.5 + 0.5, 0.0, 1.0));
    float tip = up * up;
    pos.y += tip * (0.50 + 0.55 * u_Explode * burst);
    pos.xz *= mix(1.0, 0.60, tip);
    return vec4(pos, h);
}

void main()
{
    fs_Col = vs_Col;
    fs_Pos = vs_Pos;

    // One explosion every BURST_PERIOD seconds: sawtooth ramp, shaped by
    // impulse into a fast swell and a slow settle.
    float burst = impulse(7.0, sawtooth(u_Time, BURST_PERIOD));
    fs_Burst = burst;

    vec3 pos = vs_Pos.xyz;
    vec3 nor = normalize(vs_Nor.xyz);

    // Rebuild the normal from the displaced surface, otherwise the shading
    // keeps following the original sphere and the noise only shows up in the
    // silhouette. Two neighbours along a tangent basis, crossed.
    vec3 helper = abs(nor.y) < 0.99 ? vec3(0, 1, 0) : vec3(1, 0, 0);
    vec3 tan1 = normalize(cross(helper, nor));
    vec3 tan2 = cross(nor, tan1);

    vec4 p0 = displace(pos, nor, burst);
    vec4 p1 = displace(pos + tan1 * EPS, nor, burst);
    vec4 p2 = displace(pos + tan2 * EPS, nor, burst);

    fs_Nor = vec4(mat3(u_ModelInvTr) * normalize(cross(p1.xyz - p0.xyz,
                                                       p2.xyz - p0.xyz)), 0);

    // Divide out the amplitudes so the palette holds up as the sliders move.
    float range = max(0.001, 1.6 * (u_Displace + u_NoiseAmp));
    fs_Heat = clamp(p0.w / range * 0.5 + 0.5, 0.0, 1.0);

    vec4 modelposition = u_Model * vec4(p0.xyz, 1.0);
    fs_WorldPos = modelposition;
    fs_LightVec = lightPos - modelposition;
    gl_Position = u_ViewProj * modelposition;
}
