import Svg, { Path, type SvgProps } from 'react-native-svg';

/** Vector from `assets/icons/back.svg` — keep path in sync if the asset changes. */
const BACK_PATH =
  'M0 5.99657C0 6.16928 0.0644172 6.32127 0.200408 6.45253L5.87628 11.8066C5.99796 11.9309 6.15542 11.9932 6.34152 11.9932C6.7137 11.9932 7 11.7237 7 11.3645C7 11.1848 6.92127 11.0329 6.80675 10.9154L1.59611 5.99657L6.80675 1.07772C6.92127 0.960279 7 0.801385 7 0.628672C7 0.269431 6.7137 0 6.34152 0C6.15542 0 5.99796 0.0621764 5.87628 0.179621L0.200408 5.54061C0.0644172 5.66496 0 5.82385 0 5.99657Z';

type Props = SvgProps & {
  width?: number;
  height?: number;
  color?: string;
};

export function BackIcon({ width = 7, height = 12, color = '#148240', ...props }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 7 12" fill="none" {...props}>
      <Path d={BACK_PATH} fill={color} />
    </Svg>
  );
}
