// 3D perlin + fbm, same as HW0. In its own file because the vertex shader,
// the fragment shader and the background all want it.

vec3 random3(vec3 p) {
    return fract(sin(vec3(
        dot(p, vec3(127.1, 311.7,  74.7)),
        dot(p, vec3(269.5, 183.3, 246.1)),
        dot(p, vec3(113.5, 271.9, 124.6))
    )) * 43758.5453) * 2.0 - 1.0;
}

float random1(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

// one corner's contribution: gradient dotted with the offset, quintic falloff
float surflet(vec3 p, vec3 gridPoint) {
    vec3 d = abs(p - gridPoint);
    vec3 t = vec3(1.0) - 6.0 * pow(d, vec3(5.0))
                       + 15.0 * pow(d, vec3(4.0))
                       - 10.0 * pow(d, vec3(3.0));
    float height = dot(p - gridPoint, random3(gridPoint));
    return height * t.x * t.y * t.z;
}

float perlin3(vec3 p) {
    float sum = 0.0;
    vec3 base = floor(p);
    for (int dx = 0; dx <= 1; ++dx) {
        for (int dy = 0; dy <= 1; ++dy) {
            for (int dz = 0; dz <= 1; ++dz) {
                sum += surflet(p, base + vec3(float(dx), float(dy), float(dz)));
            }
        }
    }
    return sum;
}

// each octave doubles the frequency and halves the amplitude
float fbm3(vec3 p, int octaves) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 8; ++i) {
        if (i >= octaves) break;
        sum += amp * perlin3(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return sum;
}
