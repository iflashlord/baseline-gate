import { renderMarkdown, renderSimpleMarkdown, formatGeminiResponse } from '../utils/markdownRenderer';

/**
 * Test file to demonstrate the new markdown rendering capabilities
 */

// Example Markdown content that might come from Gemini
const geminiResponse = `
# Solution for Cross-Browser Compatibility

Here's how to fix the **CSS Grid** issue:

## 1. Add Fallback Support

Use \`display: flex\` as a fallback:

\`\`\`css
.grid-container {
  display: flex;
  flex-wrap: wrap;
  display: grid; /* This will override flex in supporting browsers */
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}
\`\`\`

## 2. Feature Detection

You can also use \`@supports\` for progressive enhancement:

\`\`\`css
@supports (display: grid) {
  .grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}
\`\`\`

### Browser Support

- **Chrome**: Full support since version 57
- **Firefox**: Full support since version 52  
- **Safari**: Full support since version 10.1
- **Edge**: Full support since version 16

> **Note**: Always test in older browsers that your users might be using.

For more information, check out:
- [MDN Grid Documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
- [Can I Use Grid Support](https://caniuse.com/css-grid)
`;

const simpleMarkdown = `
**Quick Fix**: Update your \`package.json\` to use the latest version.

Steps:
1. Run \`npm update\`
2. Check for breaking changes
3. Test your application

*This should resolve the compatibility issues.*
`;

// Test the rendering functions
export function testMarkdownRendering(): void {
  console.log('=== Full Markdown Rendering ===');
  const fullHtml = renderMarkdown(geminiResponse);
  console.log(fullHtml);
  
  console.log('\n=== Simple Markdown Rendering ===');
  const simpleHtml = renderSimpleMarkdown(simpleMarkdown);
  console.log(simpleHtml);
  
  console.log('\n=== Gemini Response Formatting ===');
  const geminiHtml = formatGeminiResponse(geminiResponse, 'grid');
  console.log(geminiHtml);
}