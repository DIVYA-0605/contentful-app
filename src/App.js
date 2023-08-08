// src/App.js
import React from 'react';
import './App.css';
import FileUpload from './components/FileUpload';

function App() {
  return (
    <div className="App">
      <header>
        <h1>Contentful File Upload App</h1>
      </header>
      <main>
        <FileUpload />
      </main>
    </div>
  );
}

export default App;
