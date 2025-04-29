import React from 'react'
import ReactDOM from 'react-dom/client'
import { ReactFlowProvider } from 'reactflow'
import App from './App.tsx'
import './index.css'
import { GraphProvider } from './contexts/GraphContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReactFlowProvider>
      <GraphProvider>
        <App />
      </GraphProvider>
    </ReactFlowProvider>
  </React.StrictMode>,
)
