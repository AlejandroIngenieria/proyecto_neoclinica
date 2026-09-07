"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-slate-900 group-[.toaster]:text-slate-900 dark:group-[.toaster]:text-white group-[.toaster]:border-slate-200 dark:group-[.toaster]:border-slate-800 group-[.toaster]:shadow-xl group-[.toaster]:rounded-lg p-4 flex items-start gap-3 w-full font-sans border",
          description: "group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400 text-sm mt-0.5",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white font-semibold text-xs px-3 py-1.5 rounded-lg",
          cancelButton:
            "group-[.toast]:bg-slate-100 dark:group-[.toast]:bg-slate-800 group-[.toast]:text-slate-600 dark:group-[.toast]:text-slate-300 font-semibold text-xs px-3 py-1.5 rounded-lg",
          title: "text-sm font-semibold text-slate-900 dark:text-white",
          icon: "mt-0.5",
          success: "text-emerald-600 dark:text-emerald-400",
          error: "text-red-600 dark:text-red-400",
          warning: "text-amber-600 dark:text-amber-400",
          info: "text-blue-600 dark:text-blue-400",
          ...props.toastOptions?.classNames,
        },
        ...props.toastOptions,
      }}
      {...props}
    />
  )
}

export { Toaster }
