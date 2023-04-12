import React, { Suspense } from 'react'
import Demo from './Demo'

const App = () => {
  return (
    <Suspense fallback={<div>loading...</div>}>
      <Demo />
    </Suspense>
  )
}

export default App
