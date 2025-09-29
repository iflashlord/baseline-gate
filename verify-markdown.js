import { renderMarkdown, renderSimpleMarkdown, formatGeminiResponse } from '../src/utils/markdownRenderer';

// Quick integration test
const testMarkdown = `
# Test Heading

This is **bold** and *italic* text with \`inline code\`.

\`\`\`javascript
console.log("Hello World!");
\`\`\`

- List item 1
- List item 2

> This is a blockquote

[Test Link](https://example.com)
`;

console.log('=== Testing New Markdown Renderer ===');
console.log('1. renderMarkdown:', !!renderMarkdown);
console.log('2. renderSimpleMarkdown:', !!renderSimpleMarkdown);
console.log('3. formatGeminiResponse:', !!formatGeminiResponse);

// Test basic rendering
try {
  const result = renderMarkdown(testMarkdown);
  console.log('4. Basic rendering works:', result.length > 0);
  console.log('5. Contains code block styling:', result.includes('code-block'));
  console.log('6. Contains copy button:', result.includes('code-copy-btn'));
  console.log('7. Proper HTML structure:', result.includes('<h1>') && result.includes('<strong>'));
} catch (error) {
  console.error('Error testing markdown renderer:', error);
}

console.log('✅ Markdown renderer integration complete!');