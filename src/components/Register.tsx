import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { PageLayout } from "./PageLayout"

function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    setShowSuccess(true)
    
    setTimeout(() => {
      navigate("/login")
    }, 2000)
  }

  return (
    <PageLayout title="Create Account">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
          <div className="glass-card p-4 pr-6 flex items-center gap-3 shadow-2xl">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">Success!</h4>
              <p className="text-sm text-slate-600">Account created successfully</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              className="glass-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              className="glass-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="btn-primary w-full"
          disabled={isLoading}
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link 
            to="/login" 
            className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </form>
    </PageLayout>
  )
}

export default Register
