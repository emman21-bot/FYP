const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

/**
 * Convert Markdown documentation to PDF
 */
async function convertMarkdownToPDF() {
  try {
    // Read the algorithm documentation markdown file
    const markdownPath = path.join(__dirname, 'ALGORITHM_DOCUMENTATION.md');
    const markdownContent = fs.readFileSync(markdownPath, 'utf8');
    
    // Simple conversion from markdown to HTML for basic formatting
    // In a production environment, you might want to use a more robust markdown parser
    let htmlContent = markdownContent
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>')  // Italics
      .replace(/`(.*?)`/g, '<code>$1</code>')  // Inline code
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')  // Code blocks
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')  // H1
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')  // H2
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')  // H3
      .replace(/^- (.*$)/gm, '<li>$1</li>')  // List items
      .replace(/<li>(.*?)(<\/li>)/g, '<ul>$&</ul>')  // Wrap list items
      .replace(/\n\n/g, '</p><p>')  // Paragraphs
      .replace(/\n/g, '<br>');  // Line breaks
    
    // Create full HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>DailyMed Algorithm Documentation</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #000000;
          }
          h1, h2, h3 {
            color: #000000;
          }
          h1 {
            border-bottom: 2px solid #000000;
            padding-bottom: 10px;
          }
          h2 {
            border-bottom: 1px solid #666666;
            padding-bottom: 5px;
            margin-top: 30px;
          }
          pre {
            background-color: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
          }
          code {
            font-family: 'Courier New', monospace;
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
          }
          ul {
            margin: 10px 0;
          }
          li {
            margin: 5px 0;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
        </style>
      </head>
      <body>
        <h1>DailyMed Algorithm Documentation</h1>
        <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
        <p>${htmlContent}</p>
      </body>
      </html>
    `;
    
    // Launch browser and generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Set content and wait for it to load
    await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' });
    
    // Generate PDF
    const pdfPath = path.join(__dirname, 'ALGORITHM_DOCUMENTATION.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    await browser.close();
    
    console.log(`✅ PDF generated successfully at: ${pdfPath}`);
    return pdfPath;
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
}

// Run the conversion if this script is executed directly
if (require.main === module) {
  convertMarkdownToPDF()
    .then(() => {
      console.log('Documentation PDF generation completed!');
    })
    .catch((error) => {
      console.error('Failed to generate PDF:', error);
      process.exit(1);
    });
}

module.exports = { convertMarkdownToPDF };