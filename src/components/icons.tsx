import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

export type IconName =
  | 'home'
  | 'search'
  | 'profile'
  | 'edit'
  | 'back'
  | 'close'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'grip'
  | 'check'
  | 'camera'
  | 'chevronRight'
  | 'chevronDown'
  | 'clock'
  | 'settings'
  | 'more'
  | 'shelf'
  | 'up'
  | 'down'
  | 'star';

/**
 * Line icons drawn on a 24-unit grid, matching the design canvas. Decorative: the
 * pressable around an icon always carries the accessibility label.
 */
export function Icon({
  name,
  size = 24,
  color = colors.ink,
  strokeWidth = 1.8,
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
}) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" pointerEvents="none">
      {name === 'home' ? (
        <Path {...stroke} d="M4 10.3 12 4l8 6.3V19a1.5 1.5 0 0 1-1.5 1.5h-4V15a2.5 2.5 0 0 0-5 0v5.5h-4A1.5 1.5 0 0 1 4 19z" />
      ) : name === 'search' ? (
        <>
          <Circle {...stroke} cx={11} cy={11} r={6.5} />
          <Path {...stroke} d="m20 20-4.2-4.2" />
        </>
      ) : name === 'profile' ? (
        <>
          <Circle {...stroke} cx={12} cy={8} r={3.6} />
          <Path {...stroke} d="M4.5 20c0-3.8 3.4-6 7.5-6s7.5 2.2 7.5 6z" />
        </>
      ) : name === 'edit' ? (
        <>
          <Path {...stroke} d="M4 20h4L19 9l-4-4L4 16z" />
          <Path {...stroke} d="m13.5 6.5 4 4" />
        </>
      ) : name === 'back' ? (
        <Path {...stroke} d="m15 5-7 7 7 7" />
      ) : name === 'close' ? (
        <Path {...stroke} d="M6 6l12 12M18 6 6 18" />
      ) : name === 'plus' ? (
        <Path {...stroke} d="M12 5v14M5 12h14" />
      ) : name === 'minus' ? (
        <Path {...stroke} d="M5 12h14" />
      ) : name === 'trash' ? (
        <Path {...stroke} d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
      ) : name === 'grip' ? (
        <>
          {[8, 16].map((x) => [6, 12, 18].map((y) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} fill={color} />))}
        </>
      ) : name === 'check' ? (
        <Path {...stroke} d="m5 12 5 5 9-10" />
      ) : name === 'camera' ? (
        <>
          <Path
            {...stroke}
            d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.5-2h5L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"
          />
          <Circle {...stroke} cx={12} cy={12.5} r={3.2} />
        </>
      ) : name === 'chevronRight' ? (
        <Path {...stroke} d="m9 5 7 7-7 7" />
      ) : name === 'chevronDown' ? (
        <Path {...stroke} d="m6 9 6 6 6-6" />
      ) : name === 'up' ? (
        <Path {...stroke} d="m6 15 6-6 6 6" />
      ) : name === 'down' ? (
        <Path {...stroke} d="m6 9 6 6 6-6" />
      ) : name === 'clock' ? (
        <>
          <Circle {...stroke} cx={12} cy={12} r={8.5} />
          <Path {...stroke} d="M12 7.5V12l3 2" />
        </>
      ) : name === 'settings' ? (
        <>
          <Circle {...stroke} cx={12} cy={12} r={3} />
          <Path
            {...stroke}
            d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"
          />
        </>
      ) : name === 'more' ? (
        <>
          <Circle cx={5} cy={12} r={2} fill={color} />
          <Circle cx={12} cy={12} r={2} fill={color} />
          <Circle cx={19} cy={12} r={2} fill={color} />
        </>
      ) : name === 'shelf' ? (
        <Path {...stroke} d="M4 15h16M7 15V8h4v7M13 15V5h4v10M3 19h18" />
      ) : name === 'star' ? (
        <Path
          stroke={color}
          strokeWidth={1.6}
          strokeLinejoin="round"
          fill={filled ? color : 'none'}
          d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"
        />
      ) : null}
    </Svg>
  );
}
