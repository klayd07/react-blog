import { createSlice } from "@reduxjs/toolkit"

type AuthState = {
  user: any | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, 
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload
      state.isAuthenticated = true
      state.isLoading = false
    },
    clearUser(state) {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
    },
  },
})

export const { setUser, clearUser } = authSlice.actions
export default authSlice.reducer
