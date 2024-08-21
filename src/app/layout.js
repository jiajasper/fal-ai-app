'use client'

import './globals.css'
import { Sarala } from 'next/font/google'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { AuthContextProvider, useAuth } from '../context/FirebaseAuthContext'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/clientApp'
import { useRouter } from 'next/navigation'
import Link from 'next/link';


const sarala = Sarala({ 
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sarala',
})

function NavBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { user, credits } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (error) {
      console.error('Error signing out: ', error)
    }
  }

  return (
    <nav className="sticky top-0 bg-white bg-opacity-80 backdrop-blur-[20px] z-50 border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="font-bold text-lg">Animate Diff Space</div>
        {user && (
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <Sparkles size={18} />
              <span>{credits} credits</span>
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                <Link href="/buy-credits" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Buy Credits
                </Link>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={sarala.variable}>
      <AuthContextProvider>
        <body className="font-sarala bg-white text-gray-900">
          <NavBar />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="p-4 mt-8 border-t">
            <div className="container mx-auto text-center text-gray-600">
              <p>&copy; 2024 Animate Diff Space. All rights reserved.</p>
            </div>
          </footer>
        </body>
      </AuthContextProvider>
    </html>
  )
}