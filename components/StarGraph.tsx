import React from 'react';

interface StarGraphProps {
    data: Record<string, number>;
}

export const StarGraph: React.FC<StarGraphProps> = ({ data }) => {
    const categories = Object.keys(data);
    const values = Object.values(data);
    const maxVal = Math.max(...(values as number[]), 5); // Minimum scale of 5 for aesthetics

    const size = 380;
    const center = size / 2;
    const radius = size * 0.45;

    const angleStep = (Math.PI * 2) / categories.length;

    // Generate points for the shape
    const points = categories.map((cat, i) => {
        const val = data[cat];
        const r = (val / maxVal) * radius;
        const angle = i * angleStep - Math.PI / 2; // Start from top
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    });

    const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <svg width={size} height={size} className="overflow-visible">
                {/* Background Concentric Polygons */}
                {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => (
                    <polygon
                        key={i}
                        points={categories.map((_, idx) => {
                            const r = scale * radius;
                            const angle = idx * angleStep - Math.PI / 2;
                            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        opacity="0.4"
                    />
                ))}

                {/* Axis Lines */}
                {categories.map((_, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    return (
                        <line
                            key={i}
                            x1={center}
                            y1={center}
                            x2={center + radius * Math.cos(angle)}
                            y2={center + radius * Math.sin(angle)}
                            stroke="#cbd5e1"
                            strokeWidth="1.5"
                            opacity="0.3"
                        />
                    );
                })}

                {/* Data Polygon */}
                <polygon
                    points={pointsStr}
                    fill="rgba(99, 102, 241, 0.25)"
                    stroke="#6366f1"
                    strokeWidth="4"
                    strokeLinejoin="round"
                    className="transition-all duration-1000 ease-out"
                />

                {/* Category Labels */}
                {categories.map((cat, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const x = center + (radius + 35) * Math.cos(angle);
                    const y = center + (radius + 35) * Math.sin(angle);
                    const count = data[cat];
                    return (
                        <g key={i}>
                            <text
                                x={x}
                                y={y - 5}
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                className="text-[10px] font-black uppercase tracking-wider fill-slate-900"
                            >
                                {cat}
                            </text>
                            <text
                                x={x}
                                y={y + 10}
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                className="text-[9px] font-bold opacity-40 uppercase fill-slate-500"
                            >
                                {count} tasks
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
