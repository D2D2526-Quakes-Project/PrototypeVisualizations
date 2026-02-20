import { Slider } from "@/components/ui/slider";

interface ThresholdSliderProps {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  max?: number;
  tooltip?: string;
}

export function ThresholdSlider({ label, value, unit, onChange, max = 1, tooltip }: ThresholdSliderProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-neutral-500 w-8 shrink-0">{label}</span>
      <Slider
        value={[value]}
        onValueChange={(val) => onChange(val[0])}
        max={max}
        step={0.01}
        className="flex-1"
      />
      <span className="text-[10px] text-neutral-500 w-8 text-right shrink-0">
        {value.toFixed(2)} {unit}
      </span>
    </div>
  );
}
