import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

function normalizeProblemText(raw) {
  if (!raw) return '';

  return String(raw)
    .replace(/\r\n/g, '\n')
    .replace(/\\\$/g, '$')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']');
}

export default function ProblemText({ text }) {
  const source = normalizeProblemText(text);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <p style={{ margin: '0 0 10px' }}>{children}</p>,
      }}
    >
      {source}
    </ReactMarkdown>
  );
}
