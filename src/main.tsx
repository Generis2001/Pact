/*
 *  ███████╗████████╗██╗   ██╗██████╗ ██╗ ██████╗
 *  ██╔════╝╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗
 *  ███████╗   ██║   ██║   ██║██║  ██║██║██║   ██║
 *  ╚════██║   ██║   ██║   ██║██║  ██║██║██║   ██║
 *  ███████║   ██║   ╚██████╔╝██████╔╝██║╚██████╔╝
 *  ╚══════╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝
 *
 *  Built with Arc Studio
 *  https://studio.arc.io
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { Toaster } from 'sonner'
import { config } from './config'
import App from './App'
import './index.css'
import { ArcLogo } from './components/ui/ArcLogo'
import { ARC_CHAIN_ID } from './lib/contracts'

const queryClient = new QueryClient()

// Studio watermark component - links back to Studio
const StudioWatermark = () => (
  <a
    href="https://studio.arc.io/"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 14px',
      fontSize: '12px',
      fontWeight: 600,
      fontFamily: 'var(--font-ui)',
      color: '#1B3158',
      textDecoration: 'none',
      cursor: 'pointer',
      background: 'rgba(172, 198, 233, 0.85)',
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      zIndex: 9999,
      boxShadow: '0 4px 20px rgba(27, 49, 88, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
    }}
  >
    <ArcLogo className="h-4 w-3.5" />
    Built with Arc Studio
  </a>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          mode="light"
          theme="rounded"
          options={{ initialChainId: ARC_CHAIN_ID }}
          customTheme={{ '--ck-font-family': 'Walsheim, Arial, sans-serif' }}
        >
          <App />
          <StudioWatermark />
          <Toaster position="top-center" />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)

