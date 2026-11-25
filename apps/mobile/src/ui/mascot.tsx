import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { View } from 'react-native';

export function Mascot({ size = 160 }: { size?: number }) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 180 180">
        <Circle cx="90" cy="88" r="75" fill="#EFFACD" />
        <Ellipse cx="91" cy="151" rx="40" ry="6" fill="#E3E3EA" />
        <Path
          d="M43 126C35 102 49 45 79 35C110 24 137 55 143 99C152 141 127 153 94 151C68 151 48 145 43 126Z"
          fill="#8ADBF9"
        />
        <Path
          d="M47 99Q25 86 31 74M137 98Q156 80 150 71M66 146L59 156M118 147L125 157"
          stroke="#20202D"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx="78" cy="73" r="3.5" fill="#20202D" />
        <Circle cx="105" cy="70" r="3.5" fill="#20202D" />
        <Path d="M83 86Q94 100 104 83Z" fill="#20202D" />
        <Ellipse cx="67" cy="85" rx="6" ry="3" fill="#67C9EF" />
        <Ellipse cx="117" cy="81" rx="6" ry="3" fill="#67C9EF" />
        <Path
          d="M141 29L146 17M153 39L164 34M25 114L15 110"
          stroke="#CEF54D"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <Path d="M25 42L20 32M35 33L34 22" stroke="#FFE17C" strokeWidth="5" strokeLinecap="round" />
      </Svg>
    </View>
  );
}
