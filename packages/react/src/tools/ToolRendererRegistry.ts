import type { ReactNode } from 'react';

export interface ToolRendererContext<TOutput = unknown> {
  toolName: string;
  title?: string;
  description?: string;
  input?: unknown;
  output?: TOutput;
  metadata?: Record<string, unknown>;
}

export interface ToolRendererRegistration<TOutput = unknown> {
  name: string;
  icon?: ReactNode;
  render: (context: ToolRendererContext<TOutput>) => ReactNode;
  onClick?: (context: ToolRendererContext<TOutput>) => void | (() => void);
}

export class ToolRendererRegistry {
  private readonly registry = new Map<string, ToolRendererRegistration>();

  registerTool(registration: ToolRendererRegistration): void {
    this.registry.set(registration.name, registration);
  }

  registerTools(registrations: ToolRendererRegistration[]): void {
    for (const registration of registrations) {
      this.registerTool(registration);
    }
  }

  unregisterTool(toolName: string): void {
    this.registry.delete(toolName);
  }

  getTool(toolName: string): ToolRendererRegistration | undefined {
    return this.registry.get(toolName);
  }

  hasTool(toolName: string): boolean {
    return this.registry.has(toolName);
  }

  clearAll(): void {
    this.registry.clear();
  }

  getAllToolNames(): string[] {
    return Array.from(this.registry.keys());
  }
}

export const defaultToolRendererRegistry = new ToolRendererRegistry();
