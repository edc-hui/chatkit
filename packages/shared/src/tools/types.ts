export type ToolIconDescriptor =
  | {
      kind: 'image';
      src: string;
      alt?: string;
    }
  | {
      kind: 'glyph';
      text: string;
      ariaLabel?: string;
    };

export interface ToolDefinitionRegistration {
  name: string;
  title?: string;
  description?: string;
  icon?: ToolIconDescriptor;
  keywords?: string[];
}