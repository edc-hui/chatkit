import type { ToolDefinitionRegistration } from './types.js';

export class ToolDefinitionRegistry {
  private readonly registry = new Map<string, ToolDefinitionRegistration>();

  registerTool(registration: ToolDefinitionRegistration): void {
    this.registry.set(registration.name, registration);
  }

  registerTools(registrations: ToolDefinitionRegistration[]): void {
    for (const registration of registrations) {
      this.registerTool(registration);
    }
  }

  unregisterTool(toolName: string): void {
    this.registry.delete(toolName);
  }

  getTool(toolName: string): ToolDefinitionRegistration | undefined {
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

  getAllTools(): ToolDefinitionRegistration[] {
    return Array.from(this.registry.values());
  }
}

export const defaultToolDefinitionRegistry = new ToolDefinitionRegistry();