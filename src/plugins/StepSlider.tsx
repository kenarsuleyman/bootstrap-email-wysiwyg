import "./step-slider.css";

export interface Step {
  key: string;
  px: number;
}

interface StepSliderProps {
  label: string;
  steps: Step[];
  /** Current key, or null to fall back to {@link fallbackKey}. */
  value: string | null;
  fallbackKey: string;
  onChange: (key: string) => void;
}

/** A discrete range slider over a scale of {key, px} steps, with a px readout. */
export function StepSlider({
  label,
  steps,
  value,
  fallbackKey,
  onChange,
}: StepSliderProps) {
  const activeKey = value ?? fallbackKey;
  const index = Math.max(
    0,
    steps.findIndex((step) => step.key === activeKey),
  );
  const px = steps[index]?.px ?? 0;

  return (
    <label className="bew-slider">
      <span className="bew-slider-head">
        {label}
        <span className="bew-slider-px">{px}px</span>
      </span>
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={index}
        onChange={(e) => onChange(steps[Number(e.target.value)].key)}
      />
    </label>
  );
}
