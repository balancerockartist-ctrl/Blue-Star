import { useCallback, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import SolanaWalletProvider from './SolanaWalletProvider'
import './App.css'

// Placeholder destination wallet for devnet demo — replace with a real recipient address
const PAYMENT_DESTINATION = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const PAYMENT_AMOUNT_SOL = 0.001

function CameraPayApp() {
  const webcamRef = useRef<Webcam>(null)
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  const [photo, setPhoto] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string>('Ready to pay')

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setPhoto(imageSrc)
      setMessage('Ready to pay')
    }
  }, [])

  const resetPhoto = useCallback(() => {
    setPhoto(null)
    setMessage('Ready to pay')
  }, [])

  const payForItem = useCallback(async () => {
    if (!publicKey) {
      setMessage('Connect wallet first')
      return
    }

    if (!photo) {
      setMessage('Capture a photo first')
      return
    }

    setIsLoading(true)
    setMessage('Processing payment…')

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: PAYMENT_DESTINATION,
          lamports: PAYMENT_AMOUNT_SOL * LAMPORTS_PER_SOL,
        }),
      )

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'confirmed')

      setMessage(`Payment sent! Tx: ${signature.slice(0, 8)}…`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed'
      setMessage(`Error: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [connection, photo, publicKey, sendTransaction])

  return (
    <div className="app">
      <header className="app-header">
        <h1>📸 Camera Pay</h1>
        <p className="tagline">Snap → Pay → Done</p>
        <WalletMultiButton />
      </header>

      <main className="app-main">
        <section className="camera-section">
          {photo ? (
            <div className="photo-preview">
              <img src={photo} alt="Captured" className="captured-photo" />
              <button className="btn btn-secondary" onClick={resetPhoto}>
                Retake
              </button>
            </div>
          ) : (
            <div className="webcam-wrapper">
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="webcam"
                videoConstraints={{ facingMode: 'environment' }}
              />
              <button className="btn btn-capture" onClick={capturePhoto}>
                📷 Capture
              </button>
            </div>
          )}
        </section>

        <section className="payment-section">
          <p className={`status-message${isLoading ? ' loading' : ''}`}>{message}</p>
          <button
            className="btn btn-pay"
            onClick={payForItem}
            disabled={isLoading || !photo}
          >
            {isLoading ? 'Processing…' : '💳 Pay'}
          </button>
        </section>
      </main>
    </div>
  )
}

function App() {
  return (
    <SolanaWalletProvider>
      <CameraPayApp />
    </SolanaWalletProvider>
  )
}

export default App
