import React from 'react';
import { Badge, Tooltip } from 'antd';
import { SYSTEM_AGENT_BADGE_ICON } from '@kweaver-ai/chatkit-shared';
import { useChatKitI18n } from '../../ChatKitProvider';

interface SystemAgentWrapperProps {
  systemAgentIconSize: number;
  children: React.ReactElement;
  size: number;
}

const SystemAgentAvatarWrapper = ({ children, systemAgentIconSize, size }: SystemAgentWrapperProps) => {
  const { t } = useChatKitI18n();
  
  return (
    <Badge
      count={
        <span>
          <Tooltip title={t('agent.badge.system')} placement="right">
            <img
              alt=""
              src={SYSTEM_AGENT_BADGE_ICON}
              style={{
                width: systemAgentIconSize,
                height: systemAgentIconSize,
                display: 'block',
              }}
            />
          </Tooltip>
        </span>
      }
      offset={[-4, size - 4]}
    >
      {children}
    </Badge>
  );
};

export default SystemAgentAvatarWrapper;
