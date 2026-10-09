import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem 1.5rem',
          maxWidth: '560px',
          margin: '2rem auto',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1.5px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '16px',
          color: '#f8fafc',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.7)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            <AlertTriangle size={28} color="#ef4444" />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem', color: '#f87171' }}>
            घटक लोड करने में समस्या आई (Rendering Notice)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
            {this.state.error?.message || 'अस्थायी रेंडरिंग त्रुटि। डेटा सुरक्षित है।'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              onClick={this.handleReload}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.6rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1e3a8a, #2563eb)'
              }}
            >
              <RefreshCw size={16} />
              <span>पुनः प्रयास करें (Reload)</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
