import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import EntryForm from './EntryForm'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EntryForm />
  </StrictMode>,
)
