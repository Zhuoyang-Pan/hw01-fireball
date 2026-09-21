// Toolbox functions from the slides. main.ts pastes this file into whichever
// shaders need it, since ?raw imports give us no #include.

// bias pulls a 0-1 signal toward 0 or 1, endpoints stay put.
float bias(float b, float t) {
    return pow(t, log(b) / log(0.5));
}

// gain is bias mirrored about 0.5, so it works on the middle of the curve.
float gain(float g, float t) {
    return t < 0.5 ? bias(1.0 - g, 2.0 * t) * 0.5
                   : 1.0 - bias(1.0 - g, 2.0 - 2.0 * t) * 0.5;
}

// smooth bump at c, half-width w
float pulse(float c, float w, float x) {
    return smoothstep(c - w, c, x) - smoothstep(c, c + w, x);
}

// 0-1 ramp that resets every period
float sawtooth(float x, float period) {
    return mod(x, period) / period;
}

float triangleWave(float x, float freq, float amp) {
    return abs(mod(x * freq, amp * 2.0) - amp);
}

float easeInOutQuad(float t) {
    return t < 0.5 ? 2.0 * t * t : 1.0 - pow(-2.0 * t + 2.0, 2.0) * 0.5;
}

// fast attack, exponential decay
float impulse(float k, float x) {
    float h = k * x;
    return h * exp(1.0 - h);
}
