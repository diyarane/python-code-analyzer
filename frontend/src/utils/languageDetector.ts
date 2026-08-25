export interface LanguageInfo {
  id: string;
  displayName: string;
  extensions: string[];
  supported: boolean;
  monacoLanguage: string;
}

export interface ClientDetectionResult {
  language: string;
  displayName: string;
  source: 'manual' | 'extension' | 'content' | 'auto';
  confidence: number;
  supported: boolean;
  monacoLanguage: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    id: 'python',
    displayName: 'Python',
    extensions: ['.py', '.pyw', '.pyi'],
    supported: true,
    monacoLanguage: 'python',
  },
  {
    id: 'javascript',
    displayName: 'JavaScript',
    extensions: ['.js', '.mjs', '.cjs'],
    supported: true,
    monacoLanguage: 'javascript',
  },
  {
    id: 'javascript_jsx',
    displayName: 'JavaScript/JSX',
    extensions: ['.jsx'],
    supported: true,
    monacoLanguage: 'javascript',
  },
  {
    id: 'typescript',
    displayName: 'TypeScript',
    extensions: ['.ts', '.mts', '.cts'],
    supported: true,
    monacoLanguage: 'typescript',
  },
  {
    id: 'typescript_tsx',
    displayName: 'TypeScript/TSX',
    extensions: ['.tsx'],
    supported: true,
    monacoLanguage: 'typescript',
  },
  {
    id: 'java',
    displayName: 'Java',
    extensions: ['.java'],
    supported: true,
    monacoLanguage: 'java',
  },
  {
    id: 'c',
    displayName: 'C',
    extensions: ['.c', '.h'],
    supported: true,
    monacoLanguage: 'c',
  },
  {
    id: 'cpp',
    displayName: 'C++',
    extensions: ['.cpp', '.hpp', '.cc', '.cxx', '.hh'],
    supported: true,
    monacoLanguage: 'cpp',
  },
  {
    id: 'go',
    displayName: 'Go',
    extensions: ['.go'],
    supported: true,
    monacoLanguage: 'go',
  },
  {
    id: 'rust',
    displayName: 'Rust',
    extensions: ['.rs'],
    supported: true,
    monacoLanguage: 'rust',
  },
];

export const detectFrontendLanguage = (
  code: string,
  filename?: string,
  selectedMode: string = 'auto'
): ClientDetectionResult => {
  // 1. Manual selection override
  if (selectedMode !== 'auto') {
    const matched = SUPPORTED_LANGUAGES.find((l) => l.id === selectedMode);
    if (matched) {
      return {
        language: matched.id,
        displayName: matched.displayName,
        source: 'manual',
        confidence: 1.0,
        supported: matched.supported,
        monacoLanguage: matched.monacoLanguage,
      };
    }
  }

  // 2. File extension mapping
  if (filename && filename.includes('.')) {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    const matched = SUPPORTED_LANGUAGES.find((l) => l.extensions.includes(ext));
    if (matched) {
      return {
        language: matched.id,
        displayName: matched.displayName,
        source: 'extension',
        confidence: 0.95,
        supported: matched.supported,
        monacoLanguage: matched.monacoLanguage,
      };
    }
  }

  // 3. Content heuristics
  if (code && code.trim()) {
    if (code.includes('package main') || code.includes('func main()')) {
      const matched = SUPPORTED_LANGUAGES.find((l) => l.id === 'go')!;
      return { ...matched, language: matched.id, source: 'content', confidence: 0.90 };
    }

    if (code.includes('fn main()') || code.includes('let mut ') || code.includes('println!(')) {
      const matched = SUPPORTED_LANGUAGES.find((l) => l.id === 'rust')!;
      return { ...matched, language: matched.id, source: 'content', confidence: 0.90 };
    }

    if (code.includes('public class ') || code.includes('System.out.print')) {
      const matched = SUPPORTED_LANGUAGES.find((l) => l.id === 'java')!;
      return { ...matched, language: matched.id, source: 'content', confidence: 0.90 };
    }

    if (code.includes('#include <iostream>') || code.includes('std::cout')) {
      const matched = SUPPORTED_LANGUAGES.find((l) => l.id === 'cpp')!;
      return { ...matched, language: matched.id, source: 'content', confidence: 0.90 };
    }

    if (code.includes('#include <stdio.h>') || code.includes('printf(')) {
      const matched = SUPPORTED_LANGUAGES.find((l) => l.id === 'c')!;
      return { ...matched, language: matched.id, source: 'content', confidence: 0.85 };
    }

    const pythonKeywords = ['def ', 'import ', 'from ', 'class ', 'elif ', 'self.', 'print('];
    const pyMatches = pythonKeywords.filter((kw) => code.includes(kw)).length;

    const jsKeywords = ['const ', 'let ', 'var ', 'function ', 'export ', 'import ', '=>', 'console.log('];
    const jsMatches = jsKeywords.filter((kw) => code.includes(kw)).length;

    const tsKeywords = ['interface ', 'type ', ': string', ': number', ': boolean', 'as '];
    const tsMatches = tsKeywords.filter((kw) => code.includes(kw)).length;

    if (tsMatches >= 1 && jsMatches >= 1) {
      const matched = SUPPORTED_LANGUAGES.find((l) => l.id === 'typescript')!;
      return { ...matched, language: matched.id, source: 'content', confidence: 0.85 };
    }

    if (jsMatches >= 2) {
      const matched = SUPPORTED_LANGUAGES.find((l) => l.id === 'javascript')!;
      return { ...matched, language: matched.id, source: 'content', confidence: 0.80 };
    }

    if (pyMatches >= 1) {
      const matched = SUPPORTED_LANGUAGES.find((l) => l.id === 'python')!;
      return { ...matched, language: matched.id, source: 'content', confidence: 0.90 };
    }
  }

  // Default fallback to Python
  const py = SUPPORTED_LANGUAGES[0];
  return {
    language: py.id,
    displayName: py.displayName,
    source: 'auto',
    confidence: 0.0,
    supported: py.supported,
    monacoLanguage: py.monacoLanguage,
  };
};
