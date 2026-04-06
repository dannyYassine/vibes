import { WeatherCondition } from './weather.model';

export interface GradientConfig {
  stops: string[];
  direction: string;
  textColor: string;
}

const GRADIENTS: Record<string, GradientConfig> = {
  clear_day: {
    stops: ['#F9D976', '#F39F86', '#E8837C'],
    direction: '135deg',
    textColor: '#1A1A1A',
  },
  clear_night: {
    stops: ['#1A1A2E', '#16213E', '#0F3460'],
    direction: '135deg',
    textColor: '#FFFFFF',
  },
  clouds_day: {
    stops: ['#D4D3DD', '#B8C6DB', '#A0AAB8'],
    direction: '135deg',
    textColor: '#1A1A1A',
  },
  clouds_night: {
    stops: ['#2C2C54', '#474787', '#3B3B6D'],
    direction: '135deg',
    textColor: '#FFFFFF',
  },
  rain: {
    stops: ['#B0C4DE', '#8AACC8', '#6B8DB2', '#C8B6D4'],
    direction: '135deg',
    textColor: '#1A1A1A',
  },
  drizzle: {
    stops: ['#C5CAE9', '#B0C4DE', '#A0AAB8'],
    direction: '135deg',
    textColor: '#1A1A1A',
  },
  thunderstorm: {
    stops: ['#4A4458', '#37474F', '#263238'],
    direction: '135deg',
    textColor: '#FFFFFF',
  },
  snow: {
    stops: ['#E8EAF6', '#C5CAE9', '#9FA8DA', '#B39DDB'],
    direction: '135deg',
    textColor: '#1A1A1A',
  },
  fog: {
    stops: ['#CFD8DC', '#B0BEC5', '#90A4AE'],
    direction: '135deg',
    textColor: '#1A1A1A',
  },
  dust: {
    stops: ['#D7CCC8', '#BCAAA4', '#A1887F'],
    direction: '135deg',
    textColor: '#1A1A1A',
  },
  tornado: {
    stops: ['#37474F', '#263238', '#1A1A2E'],
    direction: '135deg',
    textColor: '#FFFFFF',
  },
};

export function getGradientForCondition(
  condition: WeatherCondition,
  isDaytime: boolean
): GradientConfig {
  const nightConditions = ['clear', 'clouds'];

  if (!isDaytime && nightConditions.includes(condition)) {
    return GRADIENTS[`${condition}_night`] ?? GRADIENTS['clear_night'];
  }

  if (condition === 'clear' || condition === 'clouds') {
    return GRADIENTS[`${condition}_day`];
  }

  if (condition === 'mist' || condition === 'haze') {
    return GRADIENTS['fog'];
  }

  return GRADIENTS[condition] ?? GRADIENTS['clear_day'];
}

export function gradientToCss(config: GradientConfig): string {
  return `linear-gradient(${config.direction}, ${config.stops.join(', ')})`;
}
