import { Navigate } from "react-router-dom"
import { useSelector } from "react-redux"
import type { RootState } from "../store"

type Props = {
  children: JSX.Element
}

function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth
  )

  // ⏳ WAIT until auth check finishes
  if (isLoading) {
    return <p>Checking authentication...</p>
  }

  // 🔒 Block unauthenticated users
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
