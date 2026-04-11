import React from 'react';
import { Warp } from '@paper-design/shaders-react';

interface WarpBackgroundProps {
    /** Opacity of the entire shader layer (0–1) */
    opacity?: number;
}

export const WarpBackground: React.FC<WarpBackgroundProps> = ({ opacity = 1 }) => {
    return (
        <div style={{ width: '100%', height: '100%', opacity }}>
            <Warp
                style={{ width: '100%', height: '100%' }}
                proportion={0.45}
                softness={1}
                distortion={0.25}
                swirl={0.8}
                swirlIterations={10}
                shape="checks"
                shapeScale={0.1}
                scale={1}
                rotation={0}
                speed={1}
                colors={[
                    'hsl(203, 100%, 62%)',
                    'hsl(255, 100%, 72%)',
                    'hsl(158, 99%, 59%)',
                    'hsl(264, 100%, 61%)',
                ]}
            />
        </div>
    );
};
