import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

document.body.style.cssText = 'margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent'
document.documentElement.style.cssText = 'box-sizing:border-box'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
