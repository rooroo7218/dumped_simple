import { useState } from "react";
import { NeonText, NeonColorPicker, type NeonPreset } from "./ui/neon-lighting";
import { SpotlightNav } from "./ui/spotlight-nav";

export default function DemoOne() {
  const [currentPreset, setCurrentPreset] = useState<NeonPreset>("classic");
  const [intensity, setIntensity] = useState(1);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <NeonColorPicker
        currentPreset={currentPreset}
        onPresetChange={setCurrentPreset}
        intensity={intensity}
        onIntensityChange={setIntensity}
      />
      <NeonText 
        initialText="霓虹(NEON)" 
        contentEditable 
        spellCheck={false} 
        preset={currentPreset} 
        intensity={intensity} 
      />
    </div>
  );
}

export function SpotlightDemo() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">
      <SpotlightNav />
    </div>
  );
}
