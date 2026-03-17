export interface RepairMarkdownOptions {
  closeCodeFences?: boolean;
  closeInlineCode?: boolean;
  closeBlockMath?: boolean;
  closeInlineMath?: boolean;
}

const DEFAULT_OPTIONS: Required<RepairMarkdownOptions> = {
  closeCodeFences: true,
  closeInlineCode: true,
  closeBlockMath: true,
  closeInlineMath: true,
};

function countOccurrences(source: string, token: string): number {
  if (!token) {
    return 0;
  }

  let index = 0;
  let count = 0;

  while (index < source.length) {
    const foundAt = source.indexOf(token, index);
    if (foundAt === -1) {
      break;
    }

    count += 1;
    index = foundAt + token.length;
  }

  return count;
}

function stripCodeFences(source: string): string {
  return source.replace(/```[\s\S]*?```/g, '');
}

function stripBlockMath(source: string): string {
  return source.replace(/\$\$[\s\S]*?\$\$/g, '');
}

export function repairMarkdown(source: string, options: RepairMarkdownOptions = {}): string {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  let next = source;

  if (resolved.closeCodeFences && countOccurrences(next, '```') % 2 === 1) {
    next += '\n```';
  }

  if (resolved.closeBlockMath && countOccurrences(stripCodeFences(next), '$$') % 2 === 1) {
    next += '\n$$';
  }

  if (resolved.closeInlineCode) {
    const withoutFences = stripCodeFences(next).replace(/```/g, '');
    if (countOccurrences(withoutFences, '`') % 2 === 1) {
      next += '`';
    }
  }

  if (resolved.closeInlineMath) {
    const withoutBlockMath = stripBlockMath(stripCodeFences(next)).replace(/\$\$/g, '');
    if (countOccurrences(withoutBlockMath, '$') % 2 === 1) {
      next += '$';
    }
  }

  return next;
}
