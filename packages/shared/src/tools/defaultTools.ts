import { defaultToolDefinitionRegistry } from './ToolDefinitionRegistry.js';
import type { ToolDefinitionRegistration } from './types.js';

export const defaultToolDefinitions: ToolDefinitionRegistration[] = [
  {
    name: 'doc_qa',
    title: 'Document QA',
    icon: { kind: 'glyph', text: 'DQ', ariaLabel: 'Document QA' },
  },
  {
    name: 'zhipu_search_tool',
    title: 'Web Search',
    icon: { kind: 'glyph', text: 'WS', ariaLabel: 'Web Search' },
  },
  {
    name: 'online_search_cite_tool',
    title: 'Online Search',
    icon: { kind: 'glyph', text: 'OS', ariaLabel: 'Online Search' },
  },
  {
    name: 'text2ngql',
    title: 'NGQL Query',
    icon: { kind: 'glyph', text: 'NG', ariaLabel: 'NGQL Query' },
  },
  {
    name: 'execute_code',
    title: 'Code Execution',
    icon: { kind: 'glyph', text: 'EX', ariaLabel: 'Code Execution' },
  },
  {
    name: 'text2metric',
    title: 'Metric Query',
    icon: { kind: 'glyph', text: 'MT', ariaLabel: 'Metric Query' },
  },
  {
    name: 'text2sql',
    title: 'SQL Query',
    icon: { kind: 'glyph', text: 'SQL', ariaLabel: 'SQL Query' },
  },
  {
    name: 'json2plot',
    title: 'Chart Builder',
    icon: { kind: 'glyph', text: 'CH', ariaLabel: 'Chart Builder' },
  },
  {
    name: 'web_processor',
    title: 'Web Processor',
    icon: { kind: 'glyph', text: 'WP', ariaLabel: 'Web Processor' },
  },
  {
    name: 'datasource_filter',
    title: 'Datasource Filter',
    icon: { kind: 'glyph', text: 'DF', ariaLabel: 'Datasource Filter' },
  },
  {
    name: 'datasource_rerank',
    title: 'Datasource Rerank',
    icon: { kind: 'glyph', text: 'DR', ariaLabel: 'Datasource Rerank' },
  },
  {
    name: 'af_sailor',
    title: 'AF Sailor',
    icon: { kind: 'glyph', text: 'AF', ariaLabel: 'AF Sailor' },
  },
  {
    name: 'create_file',
    title: 'Create File',
    icon: { kind: 'glyph', text: 'CF', ariaLabel: 'Create File' },
  },
  {
    name: 'read_file',
    title: 'Read File',
    icon: { kind: 'glyph', text: 'RF', ariaLabel: 'Read File' },
  },
  {
    name: 'list_files',
    title: 'List Files',
    icon: { kind: 'glyph', text: 'LF', ariaLabel: 'List Files' },
  },
  {
    name: 'execute_command',
    title: 'Execute Command',
    icon: { kind: 'glyph', text: 'CMD', ariaLabel: 'Execute Command' },
  },
  {
    name: 'upload_file',
    title: 'Upload File',
    icon: { kind: 'glyph', text: 'UP', ariaLabel: 'Upload File' },
  },
  {
    name: 'download_file',
    title: 'Download File',
    icon: { kind: 'glyph', text: 'DL', ariaLabel: 'Download File' },
  },
  {
    name: 'get_status',
    title: 'Get Sandbox Status',
    icon: { kind: 'glyph', text: 'GS', ariaLabel: 'Get Sandbox Status' },
  },
  {
    name: 'close_sandbox',
    title: 'Close Sandbox',
    icon: { kind: 'glyph', text: 'CS', ariaLabel: 'Close Sandbox' },
  },
];

defaultToolDefinitionRegistry.registerTools(defaultToolDefinitions);
