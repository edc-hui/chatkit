import React, { useMemo } from 'react';
import { Badge, Tooltip } from 'antd';
import { BUILT_IN_AGENT_BADGE_ICONS } from '@kweaver-ai/chatkit-shared';
import { useChatKitI18n } from '../../ChatKitProvider';
import { resolveBuiltInBadgeIcon } from './agentIconState.js';

interface BuildInAgentWrapperProps {
  size: number;
  buildInAgentIconSize: number;
  children: React.ReactElement;
}

const BuildInAgentAvatarWrapper = ({ children, buildInAgentIconSize, size }: BuildInAgentWrapperProps) => {
  const { t, locale } = useChatKitI18n();
  const buildInBadgeIcon = useMemo(
    () => resolveBuiltInBadgeIcon(locale, BUILT_IN_AGENT_BADGE_ICONS),
    [locale]
  );

  return (
    <Badge
      count={
        <span>
          <Tooltip title={t('agent.badge.builtIn')} placement="right">
            <img
              alt=""
              src={buildInBadgeIcon}
              style={{
                width: buildInAgentIconSize,
                height: buildInAgentIconSize,
                display: 'block',
              }}
            />
          </Tooltip>
        </span>
      }
      offset={[-size + buildInAgentIconSize / 2, buildInAgentIconSize / 2]}
    >
      {children}
    </Badge>
  );
};

export default BuildInAgentAvatarWrapper;
