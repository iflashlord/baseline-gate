// Test file to verify hover functionality with Gemini integration
// This file contains various baseline features to test hover tooltip

// CSS-related features 
const styles = {
  containerQuery: '@container (min-width: 300px) { .card { width: 100%; } }',
  subgrid: 'display: subgrid',
  customProperties: '--main-color: blue;'
};

// JavaScript features
const modernFeatures = {
  // Promise-based feature
  fetchData: async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  
  // URL API
  parseUrl: (urlString) => {
    const url = new URL(urlString);
    return url.pathname;
  },
  
  // Optional chaining
  getData: (obj) => {
    return obj?.data?.items?.[0];
  }
};

// Additional test cases for hover
console.log('Testing baseline features hover integration');