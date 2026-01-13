import { Navigate } from "react-router-dom"
import { useSelector } from "react-redux"
import type { RootState } from "../store"
import type { ReactNode } from "react"

type Props = {
  children: ReactNode
}

function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth
  )

  if (isLoading) {
    return <p>Checking authentication...</p>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
