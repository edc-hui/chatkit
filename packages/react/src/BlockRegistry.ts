import type { ReactNode } from 'react';

import { defaultToolRendererRegistry } from './tools/ToolRendererRegistry.js';

export interface ToolBlockRegistration {
  name: string;
  Icon?: ReactNode;
  onClick?: (block: Record<string, any>) => void | (() => void);
}

export class BlockRegistry {
  static registerTool(registration: ToolBlockRegistration): void {
    const existingRegistration = defaultToolRendererRegistry.getTool(registration.name);

    defaultToolRendererRegistry.registerTool({
      name: registration.name,
      icon: registration.Icon,
      render: existingRegistration?.render ?? (() => null),
      onClick: context => registration.onClick?.(context as Record<string, any>),
    });
  }

  static registerTools(registrations: Array<ToolBlockRegistration>): void {
    registrations.forEach(registration => {
      this.registerTool(registration);
    });
  }

  static unregisterTool(toolName: string): void {
    defaultToolRendererRegistry.unregisterTool(toolName);
  }

  static getTool(toolName: string): ToolBlockRegistration | undefined {
    const registration = defaultToolRendererRegistry.getTool(toolName);
    if (!registration) {
      return undefined;
    }

    return {
      name: registration.name,
      Icon: registration.icon,
      onClick: registration.onClick
        ? block => registration.onClick?.(block as Parameters<NonNullable<typeof registration.onClick>>[0])
        : undefined,
    };
  }

  static hasTool(toolName: string): boolean {
    return defaultToolRendererRegistry.hasTool(toolName);
  }

  static clearAll(): void {
    defaultToolRendererRegistry.clearAll();
  }

  static getAllToolNames(): string[] {
    return defaultToolRendererRegistry.getAllToolNames();
  }
}
