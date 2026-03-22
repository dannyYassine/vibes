// SVG circular progress ring component
function createProgressRing(percent, size = 56, strokeWidth = 4) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  let color = '#6e7681'; // gray - not started
  if (percent === 100) color = '#3fb950'; // green - complete
  else if (percent > 0) color = '#58a6ff'; // blue - in progress

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="progress-ring">
      <circle
        cx="${size/2}" cy="${size/2}" r="${radius}"
        fill="none"
        stroke="#30363d"
        stroke-width="${strokeWidth}"
      />
      <circle
        cx="${size/2}" cy="${size/2}" r="${radius}"
        fill="none"
        stroke="${color}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
        stroke-linecap="round"
        transform="rotate(-90 ${size/2} ${size/2})"
      />
      <text
        x="${size/2}" y="${size/2}"
        text-anchor="middle"
        dominant-baseline="central"
        fill="${color}"
        font-size="${size < 50 ? 10 : 12}"
        font-weight="600"
        font-family="Inter, sans-serif"
      >${Math.round(percent)}%</text>
    </svg>
  `;
}
