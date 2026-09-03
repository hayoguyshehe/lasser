export const SAMPLE_FILES: { name: string; description: string; content: string; format: 'svg' | 'dxf' }[] = [
  {
    name: 'healthy-star.svg',
    description: 'A clean closed star — no issues expected',
    format: 'svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <polygon points="100,10 122,77 190,77 135,117 155,185 100,145 45,185 65,117 10,77 78,77" fill="none" stroke="#ff0000" stroke-width="1"/>
</svg>`,
  },
  {
    name: 'open-path-circle.svg',
    description: 'A circle with a gap — open vector issue',
    format: 'svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <path d="M 50 100 A 50 50 0 1 0 150 100" fill="none" stroke="#0066ff" stroke-width="1"/>
  <rect x="20" y="20" width="160" height="160" fill="none" stroke="#ff0000" stroke-width="1"/>
</svg>`,
  },
  {
    name: 'duplicate-lines.svg',
    description: 'Overlapping rectangles — duplicate path issue',
    format: 'svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect x="30" y="30" width="140" height="140" fill="none" stroke="#ff0000" stroke-width="1"/>
  <rect x="30" y="30" width="140" height="140" fill="none" stroke="#00aa00" stroke-width="1"/>
  <rect x="60" y="60" width="80" height="80" fill="none" stroke="#ff6600" stroke-width="1"/>
</svg>`,
  },
  {
    name: 'bracket-sample.dxf',
    description: 'DXF with rect, circle, and polyline — multi-layer',
    format: 'dxf',
    content: `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
CUT
10
20.0
20
20.0
11
180.0
21
20.0
0
LINE
8
CUT
10
180.0
20
20.0
11
180.0
21
180.0
0
LINE
8
CUT
10
180.0
20
180.0
11
20.0
21
180.0
0
LINE
8
CUT
10
20.0
20
180.0
11
20.0
21
20.0
0
CIRCLE
8
ENGRAVE
10
100.0
20
100.0
40
40.0
0
LWPOLYLINE
8
SCORE
90
4
70
1
10
60.0
20
60.0
10
140.0
20
60.0
10
140.0
20
140.0
10
60.0
20
140.0
0
ENDSEC
0
EOF
`,
  },
];
