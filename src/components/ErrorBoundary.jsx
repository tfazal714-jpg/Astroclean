import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './ui.jsx'

/**
 * Catches render errors anywhere below it and shows a recoverable fallback
 * instead of a blank screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Deliberately minimal: no telemetry, no network. Optionally forward to
    // the parent via onError for custom handling.
    this.props.onError?.(error, info)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="w-full max-w-md border border-error/40 bg-surface p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-error" />
          <p className="mb-1 text-sm font-semibold text-text-primary">
            Something went wrong
          </p>
          <p className="mb-4 break-words text-xs leading-4 text-text-secondary">
            {this.state.error?.message || 'An unexpected error occurred while rendering.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="primary" size="sm" onClick={this.handleReset}>
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
