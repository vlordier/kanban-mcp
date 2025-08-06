import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import '../styles/markdown.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Parse markdown to HTML and sanitize it, cached with useMemo
  const sanitizedHtml = useMemo(() => {
    // Use marked synchronously to ensure it returns a string
    return DOMPurify.sanitize(marked.parse(content, { async: false }));
  }, [content]);

  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
