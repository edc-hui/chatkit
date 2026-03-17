import React from 'react';

import {
  buildWebProcessorEmbedUrl,
  createDefaultMarkdownSanitizer,
  getSafeWebProcessorUrl,
  getWebProcessorDisplayUrl,
  getWebProcessorHeight,
  getWebProcessorTitle,
} from '@kweaver-ai/chatkit-shared';

import { defaultToolRendererRegistry } from './ToolRendererRegistry.js';
import type { ToolRendererContext } from './ToolRendererRegistry.js';

function SearchResults(props: { results: Array<{ title?: string; link?: string; content?: string }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {props.results.slice(0, 3).map((result, index) => (
        <div
          key={`${result.link ?? result.title ?? 'result'}-${index}`}
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(215, 222, 235, 0.9)',
          }}
        >
          <div style={{ fontWeight: 600 }}>{result.title ?? `Result ${index + 1}`}</div>
          {result.link ? (
            <a href={result.link} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 13 }}>
              {result.link}
            </a>
          ) : null}
          {result.content ? <div style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>{result.content}</div> : null}
        </div>
      ))}
    </div>
  );
}

function TablePreview(props: { columns?: string[]; rows?: Array<Record<string, unknown>> }) {
  const columns = props.columns ?? [];
  const rows = props.rows ?? [];

  if (columns.length === 0 || rows.length === 0) {
    return null;
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(215, 222, 235, 0.9)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map(column => (
              <th
                key={column}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  background: '#f8fafc',
                  borderBottom: '1px solid rgba(215, 222, 235, 0.9)',
                }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 5).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map(column => (
                <td
                  key={`${rowIndex}-${column}`}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
                    color: '#334155',
                  }}
                >
                  {String(row[column] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function toPreviewRows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    if (typeof item === 'object' && item !== null) {
      return item as Record<string, unknown>;
    }

    return {
      index,
      value: item,
    };
  });
}

function DataRecordsPreview(props: { data: unknown }) {
  const rows = toPreviewRows(props.data);
  const columns = Array.from(
    rows.reduce<Set<string>>((accumulator, row) => {
      Object.keys(row).forEach(key => accumulator.add(key));
      return accumulator;
    }, new Set<string>())
  );

  return <TablePreview columns={columns} rows={rows} />;
}

function StructuredSpec(props: { title: string; value: unknown }) {
  if (props.value == null) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{props.title}</div>
      <pre
        style={{
          margin: 0,
          padding: '10px 12px',
          borderRadius: 12,
          background: '#0f172a',
          color: '#e2e8f0',
          overflowX: 'auto',
          fontSize: 13,
          whiteSpace: 'pre-wrap',
        }}
      >
        {typeof props.value === 'string' ? props.value : JSON.stringify(props.value, null, 2)}
      </pre>
    </div>
  );
}

function WebProcessorPreview(props: {
  output: {
    title?: string;
    url?: string;
    size?: [number, number];
  };
}) {
  const safeUrl = getSafeWebProcessorUrl(props.output.url);
  const embedUrl = buildWebProcessorEmbedUrl(props.output.url);

  if (!safeUrl || !embedUrl) {
    return null;
  }

  return (
    <div
      style={{
        overflow: 'hidden',
        borderRadius: 12,
        border: '1px solid rgba(215, 222, 235, 0.9)',
        background: '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 14px',
          borderBottom: '1px solid rgba(215, 222, 235, 0.9)',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {getWebProcessorTitle(props.output)}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: '#64748b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {getWebProcessorDisplayUrl(props.output.url)}
          </div>
        </div>
        <a href={safeUrl.toString()} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 13 }}>
          Open
        </a>
      </div>
      <iframe
        src={embedUrl}
        title={getWebProcessorTitle(props.output)}
        style={{
          display: 'block',
          width: '100%',
          height: getWebProcessorHeight(props.output),
          border: 'none',
          background: '#ffffff',
        }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

const sandboxToolNames = [
  'execute_code',
  'create_file',
  'read_file',
  'list_files',
  'execute_command',
  'upload_file',
  'download_file',
  'get_status',
  'close_sandbox',
] as const;

function formatSandboxPayload(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value == null) {
    return '';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function SandboxResult(props: { output: unknown }) {
  const output = props.output as
    | {
        stdout?: string;
        output?: string;
        content?: string;
        actionMessage?: string;
        result?: unknown;
      }
    | string
    | undefined;
  const actionMessage =
    typeof output === 'object' && output !== null ? output.actionMessage ?? '' : '';
  const text =
    typeof output === 'string'
      ? output
      : output?.stdout ?? output?.output ?? output?.content ?? formatSandboxPayload(output?.result ?? output);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {actionMessage ? <div style={{ fontSize: 13, color: '#475569' }}>{actionMessage}</div> : null}
      <pre
        style={{
          margin: 0,
          padding: '10px 12px',
          borderRadius: 12,
          background: '#0f172a',
          color: '#e2e8f0',
          overflowX: 'auto',
          fontSize: 13,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text || 'No output'}
      </pre>
    </div>
  );
}

defaultToolRendererRegistry.registerTools([
  {
    name: 'zhipu_search_tool',
    render(context) {
      const output = context.output as { results?: Array<{ title?: string; link?: string; content?: string }> } | undefined;
      const results = output?.results ?? [];

      return <SearchResults results={results} />;
    },
  },
  {
    name: 'online_search_cite_tool',
    render(context) {
      const output = context.output as { results?: Array<{ title?: string; link?: string; content?: string }> } | undefined;
      const results = output?.results ?? [];

      return <SearchResults results={results} />;
    },
  },
  {
    name: 'text2metric',
    render(context) {
      const output = context.output as {
        tableColumns?: string[];
        tableData?: Array<Record<string, unknown>>;
      } | undefined;

      return <TablePreview columns={output?.tableColumns} rows={output?.tableData} />;
    },
  },
  {
    name: 'text2sql',
    render(context) {
      const output = context.output as {
        sql?: string;
        tableColumns?: string[];
        tableData?: Array<Record<string, unknown>>;
      } | undefined;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {output?.sql ? <StructuredSpec title="SQL" value={output.sql} /> : null}
          <TablePreview columns={output?.tableColumns} rows={output?.tableData} />
        </div>
      );
    },
  },
  {
    name: 'json2plot',
    render(context) {
      const output = context.output as {
        chartType?: string;
        chartConfig?: unknown;
        tableColumns?: string[];
        tableData?: Array<Record<string, unknown>>;
      } | undefined;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {output?.chartType ? (
            <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Chart Type: {output.chartType}</div>
          ) : null}
          {output?.chartConfig ? <StructuredSpec title="Chart Config" value={output.chartConfig} /> : null}
          <TablePreview columns={output?.tableColumns} rows={output?.tableData} />
        </div>
      );
    },
  },
  {
    name: 'web_processor',
    render(context) {
      const output = context.output as {
        title?: string;
        url?: string;
        size?: [number, number];
      } | undefined;

      return output?.url ? <WebProcessorPreview output={output} /> : null;
    },
  },
  ...sandboxToolNames.map(name => ({
    name,
    render(context: ToolRendererContext) {
      return <SandboxResult output={context.output} />;
    },
  })),
  {
    name: 'doc_qa',
    render(context) {
      const output = context.output as { htmlText?: string; cites?: Array<{ title?: string; doc_name?: string; quote?: string; ds_id?: string }> } | undefined;
      const htmlText = output?.htmlText ?? '';
      const cites = output?.cites ?? [];
      const sanitize = createDefaultMarkdownSanitizer();
      const safeHtml = sanitize ? sanitize(htmlText) : htmlText;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {safeHtml ? (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: '#ffffff',
                border: '1px solid rgba(215, 222, 235, 0.9)',
                color: '#0f172a',
              }}
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          ) : null}
          {cites.slice(0, 3).map((cite, index) => (
            <div
              key={`${cite.title ?? cite.doc_name ?? 'cite'}-${index}`}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(215, 222, 235, 0.9)',
              }}
            >
              <div style={{ fontWeight: 600 }}>{cite.title ?? cite.doc_name ?? `Citation ${index + 1}`}</div>
              {cite.quote ? <div style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>{cite.quote}</div> : null}
              {cite.ds_id ? <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>ds_id: {cite.ds_id}</div> : null}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    name: 'text2ngql',
    render(context) {
      const output = context.output as {
        sql?: string;
        tableColumns?: string[];
        tableData?: Array<Record<string, unknown>>;
      } | undefined;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {output?.sql ? (
            <pre
              style={{
                margin: 0,
                padding: '10px 12px',
                borderRadius: 12,
                background: '#0f172a',
                color: '#e2e8f0',
                overflowX: 'auto',
                fontSize: 13,
              }}
            >
              {output.sql}
            </pre>
          ) : null}
          <TablePreview columns={output?.tableColumns} rows={output?.tableData} />
        </div>
      );
    },
  },
  ...(['af_sailor', 'datasource_filter', 'datasource_rerank'] as const).map(name => ({
    name,
    render(context: ToolRendererContext) {
      const output = context.output as { data?: unknown } | undefined;
      return <DataRecordsPreview data={output?.data} />;
    },
  })),
]);

export {};
