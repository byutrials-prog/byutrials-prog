export async function printAsync({ html, uri }) {
  if (typeof window === 'undefined') {
    throw new Error('Printing is only available in a browser.');
  }

  const printWindow = window.open(uri || '', '_blank');
  if (!printWindow) {
    throw new Error('Browser blocked the print window. Allow pop-ups and try again.');
  }

  if (html) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
  }, { once: true });
}

export async function printToFileAsync() {
  throw new Error('PDF file export is not available in the browser. Use the web PDF export instead.');
}

export default { printAsync, printToFileAsync };
