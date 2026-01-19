import type { ReactNode } from "react"

type Props = {
  title: string
  children: ReactNode
}

export function PageLayout({ title, children }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-2">
            {title}
          </h1>
          <div className="h-1 w-20 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full mx-auto" />
        </div>
        {children}
      </div>
    </div>
  )
}
