import { useEffect } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { useDispatch } from "react-redux"
import Login from "./components/Login"
import Register from "./components/Register"
import Blog from "./pages/Blog"
import ProtectedRoute from "./components/ProtectedRoute"
import { supabase } from "./lib/supabase"
import { setUser, clearUser } from "./store/authSlice"

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
  const initAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      dispatch(setUser(session.user))
    } else {
      dispatch(clearUser())
    }
  }

  initAuth()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      dispatch(setUser(session.user))
    } else {
      dispatch(clearUser())
    }
  })

  return () => {
    subscription.unsubscribe()
  }
}, [dispatch])


  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/blog"
        element={
          <ProtectedRoute>
            <Blog />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
