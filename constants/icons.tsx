import { Svg, Path } from 'react-native-svg';
import React from 'react';

export const NMLogo = (props: any) => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none" {...props}>
    <Path d="M5 35V5h6l8 18 8-18h6v30h-6V17l-8 18-8-18v18H5z" fill="#4169E1" stroke="#FFD700" strokeWidth={2} />
  </Svg>
);