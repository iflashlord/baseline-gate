// Test file to verify Gemini integration works
console.log('Testing Gemini integration');

// This should trigger a baseline finding
const containerQuery = document.querySelector('.container @container (width > 300px)');

// This should also trigger a baseline finding  
const dialog = document.createElement('dialog');
dialog.showModal();

// CSS Grid with newer features
const gridContainer = document.querySelector('.grid');
if (gridContainer) {
  gridContainer.style.display = 'grid';
  gridContainer.style.gridTemplateColumns = 'subgrid';
}