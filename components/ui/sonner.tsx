"use client"

import { useEffect, useState } from "react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const getActiveTheme = (): "light" | "dark" => {
      if (typeof document === "undefined") return "light"
      if (document.documentElement.classList.contains("dark")) return "dark"
      try {
        const stored = localStorage.getItem("theme")
        if (stored === "dark") return "dark"
      } catch {}
      return "light"
    }

    setCurrentTheme(getActiveTheme())

    // Observar cambios en la clase 'dark' del elemento <html> cuando el usuario cambia de tema
    const observer = new MutationObserver(() => {
      setCurrentTheme(getActiveTheme())
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "theme") {
        setCurrentTheme(getActiveTheme())
      }
    }

    window.addEventListener("storage", handleStorage)

    return () => {
      observer.disconnect()
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  return (
    <Sonner
      theme={currentTheme}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans rounded-2xl p-4 flex items-start gap-3 w-full border shadow-xl transition-colors duration-200 " +
            "bg-white text-slate-900 border-slate-200/90 shadow-slate-900/5 " +
            "dark:bg-slate-900 dark:text-white dark:border-slate-800 dark:shadow-black/50",
          description:
            "text-xs leading-relaxed mt-1 text-slate-500 dark:text-slate-400 font-medium",
          actionButton:
            "bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs",
          cancelButton:
            "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs px-3.5 py-2 rounded-xl transition",
          title: "text-sm font-bold text-slate-900 dark:text-white leading-tight",
          icon: "mt-0.5 shrink-0",
          success: "!text-emerald-600 dark:!text-emerald-400",
          error: "!text-rose-600 dark:!text-rose-400",
          warning: "!text-amber-600 dark:!text-amber-400",
          info: "!text-blue-600 dark:!text-blue-400",
          ...props.toastOptions?.classNames,
        },
        ...props.toastOptions,
      }}
      {...props}
    />
  )
}

export { Toaster }
