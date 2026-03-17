import React, { type CSSProperties } from 'react';
import { createFromIconfontCN } from '@ant-design/icons';
import classNames from 'classnames';

// 导入 shared 包中的图标资源
// 通过相对路径直接引入，避免 workspace Alias 导致非 JS/TS 文件解析失败
import '../../../../shared/src/assets/fonts/iconfont.js';
import '../../../../shared/src/assets/fonts/color-iconfont.js';

const IconBaseComponent = createFromIconfontCN({
  scriptUrl: [],
});

export interface IconFontProps {
  type: string;
  className?: string;
  style?: CSSProperties;
  onClick?: React.MouseEventHandler<HTMLElement>;
  rotate?: number;
  spin?: boolean;
}

const IconFont: React.FC<IconFontProps> = props => {
  const { className, ...restProps } = props;
  const prefixCls = 'chatkit-icon';
  return <IconBaseComponent className={classNames(prefixCls, className)} {...restProps} />;
};

export default IconFont;
