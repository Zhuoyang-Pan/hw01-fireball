#version 300 es

// The background is the base Square drawn straight in NDC. Its positions are
// already the screen corners, so there is nothing to transform.

in vec4 vs_Pos;

out vec2 fs_UV;  // -1 to 1 across the screen

void main()
{
    fs_UV = vs_Pos.xy;
    gl_Position = vs_Pos;
}
