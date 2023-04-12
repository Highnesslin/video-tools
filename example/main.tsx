import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

void createRoot(document.querySelector('#root') as HTMLDivElement).render(<App />)
