import { render, screen } from '@testing-library/react'
import App from './App'

describe('App — default route', () => {
  it('renders the Linka heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /linka/i })).toBeInTheDocument()
  })

  it('renders the placeholder message', () => {
    render(<App />)
    expect(screen.getByText(/private messaging/i)).toBeInTheDocument()
  })
})
