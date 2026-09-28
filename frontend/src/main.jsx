import React from 'react'
import ReactDOM from 'react-dom/client'
import { ApiProvider } from './api/client'
import Console from './pages/Console'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApiProvider>
      <Console />
    </ApiProvider>
  </React.StrictMode>,
)