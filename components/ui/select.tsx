"use client"

import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption<T extends string = string> {
  value: T
  label: React.ReactNode
  icon?: React.ReactNode
  description?: string
  disabled?: boolean
}

export interface SelectProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  label?: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
  disabled?: boolean
  id?: string
  ariaLabel?: string
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Selecione uma opção...",
  label,
  className,
  triggerClassName,
  contentClassName,
  disabled = false,
  id,
  ariaLabel,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  )

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Sync highlighted index with selected option when opening
  React.useEffect(() => {
    if (isOpen) {
      const selectedIndex = options.findIndex((opt) => opt.value === value)
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
    }
  }, [isOpen, options, value])

  const handleSelect = React.useCallback(
    (optionValue: T) => {
      onChange(optionValue)
      setIsOpen(false)
      triggerRef.current?.focus()
    },
    [onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault()
        if (isOpen) {
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            const opt = options[highlightedIndex]
            if (!opt.disabled) {
              handleSelect(opt.value)
            }
          }
        } else {
          setIsOpen(true)
        }
        break
      case "ArrowDown":
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0))
        }
        break
      case "ArrowUp":
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1))
        }
        break
      case "Escape":
        if (isOpen) {
          e.preventDefault()
          setIsOpen(false)
          triggerRef.current?.focus()
        }
        break
      case "Tab":
        if (isOpen) {
          setIsOpen(false)
        }
        break
    }
  }

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-all duration-150 hover:bg-accent/40 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "border-ring ring-2 ring-ring/40",
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="flex shrink-0 items-center">{selectedOption.icon}</span>
              )}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180 text-foreground"
          )}
        />
      </button>

      {/* Options Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={cn(
            "absolute left-0 top-full z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 focus:outline-none",
            contentClassName
          )}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isHighlighted = index === highlightedIndex

            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => !option.disabled && handleSelect(option.value)}
                onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
                className={cn(
                  "relative flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-75 select-none",
                  option.disabled && "cursor-not-allowed opacity-40",
                  !option.disabled && "hover:bg-accent hover:text-accent-foreground",
                  !option.disabled && isSelected && "bg-primary/10 text-primary",
                  !option.disabled && isHighlighted && "bg-accent text-accent-foreground"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {option.icon && (
                    <span className="flex shrink-0 items-center">{option.icon}</span>
                  )}
                  <div className="flex flex-col truncate">
                    <span className="truncate">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {option.description}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-primary ml-2" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
