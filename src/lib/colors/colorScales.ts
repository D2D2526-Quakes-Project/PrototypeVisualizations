export type ColorMetric = 
  | 'displacement'
  | 'displacement-x'
  | 'displacement-y'
  | 'displacement-z'
  | 'velocity'
  | 'velocity-x'
  | 'velocity-y'
  | 'velocity-z'
  | 'acceleration'
  | 'acceleration-x'
  | 'acceleration-y'
  | 'acceleration-z'
  | 'story-drift';

export interface ColorScale {
  metric: ColorMetric;
  colorStops: string[];
  label: string;
  unit: string;
}

export const COLOR_SCALES: Record<ColorMetric, ColorScale> = {
  displacement: {
    metric: 'displacement',
    colorStops: [
      'oklch(82.8% 0.189 84.429)',
      'oklch(50.5% 0.213 27.518)'
    ],
    label: 'Displacement',
    unit: 'in'
  },
  'displacement-x': {
    metric: 'displacement-x',
    colorStops: [
      'oklch(95% 0.05 120)',
      'oklch(60% 0.25 20)'
    ],
    label: 'Displacement X',
    unit: 'in'
  },
  'displacement-y': {
    metric: 'displacement-y',
    colorStops: [
      'oklch(95% 0.05 150)',
      'oklch(60% 0.25 150)'
    ],
    label: 'Displacement Y',
    unit: 'in'
  },
  'displacement-z': {
    metric: 'displacement-z',
    colorStops: [
      'oklch(95% 0.05 220)',
      'oklch(60% 0.25 220)'
    ],
    label: 'Displacement Z',
    unit: 'in'
  },
  
  velocity: {
    metric: 'velocity',
    colorStops: [
      'oklch(75% 0.15 150)',
      'oklch(65% 0.20 230)'
    ],
    label: 'Velocity',
    unit: 'in/s'
  },
  'velocity-x': {
    metric: 'velocity-x',
    colorStops: [
      'oklch(95% 0.05 120)',
      'oklch(60% 0.25 20)'
    ],
    label: 'Velocity X',
    unit: 'in/s'
  },
  'velocity-y': {
    metric: 'velocity-y',
    colorStops: [
      'oklch(95% 0.05 150)',
      'oklch(60% 0.25 150)'
    ],
    label: 'Velocity Y',
    unit: 'in/s'
  },
  'velocity-z': {
    metric: 'velocity-z',
    colorStops: [
      'oklch(95% 0.05 220)',
      'oklch(60% 0.25 220)'
    ],
    label: 'Velocity Z',
    unit: 'in/s'
  },
  
  acceleration: {
    metric: 'acceleration',
    colorStops: [
      'oklch(90% 0.05 180)',
      'oklch(55% 0.25 300)'
    ],
    label: 'Acceleration',
    unit: 'in/s²'
  },
  'acceleration-x': {
    metric: 'acceleration-x',
    colorStops: [
      'oklch(95% 0.05 120)',
      'oklch(60% 0.25 20)'
    ],
    label: 'Acceleration X',
    unit: 'in/s²'
  },
  'acceleration-y': {
    metric: 'acceleration-y',
    colorStops: [
      'oklch(95% 0.05 150)',
      'oklch(60% 0.25 150)'
    ],
    label: 'Acceleration Y',
    unit: 'in/s²'
  },
  'acceleration-z': {
    metric: 'acceleration-z',
    colorStops: [
      'oklch(95% 0.05 220)',
      'oklch(60% 0.25 220)'
    ],
    label: 'Acceleration Z',
    unit: 'in/s²'
  },
  
  'story-drift': {
    metric: 'story-drift',
    colorStops: [
      'oklch(95% 0.05 120)',
      'oklch(45% 0.25 20)'
    ],
    label: 'Story Drift',
    unit: '%'
  }
};
