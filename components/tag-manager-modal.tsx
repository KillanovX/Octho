"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  X,
  Plus,
  Trash2,
  Pencil,
  Palette,
  Code,
  Server,
  Bug,
  FileText,
  Search,
  Tag as TagIcon,
  Star,
  Zap,
  Shield,
  Heart,
  CheckCircle,
  Tag
} from "lucide-react"
import { TagItem } from "@/lib/tags-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export const tagIconMap: Record<string, typeof Palette> = {
  palette: Palette,
  code: Code,
  server: Server,
  bug: Bug,
  "file-text": FileText,
  search: Search,
  tag: TagIcon,
  star: Star,
  zap: Zap,
  shield: Shield,
  heart: Heart,
  check: CheckCircle,
}

const colorPresets = [
  { value: "#8b5cf6", name: "Violet" },
  { value: "#3b82f6", name: "Blue" },
  { value: "#10b981", name: "Emerald" },
  { value: "#ef4444", name: "Red" },
  { value: "#f59e0b", name: "Amber" },
  { value: "#14b8a6", name: "Teal" },
  { value: "#06b6d4", name: "Cyan" },
  { value: "#ec4899", name: "Pink" },
  { value: "#6366f1", name: "Indigo" },
]

const iconPresets = [
  { id: "tag", label: "Tag", Icon: TagIcon },
  { id: "palette", label: "Design", Icon: Palette },
  { id: "code", label: "Código", Icon: Code },
  { id: "server", label: "Servidor", Icon: Server },
  { id: "bug", label: "Bug", Icon: Bug },
  { id: "file-text", label: "Texto", Icon: FileText },
  { id: "search", label: "Busca", Icon: Search },
  { id: "star", label: "Estrela", Icon: Star },
  { id: "zap", label: "Zap", Icon: Zap },
  { id: "shield", label: "Escudo", Icon: Shield },
  { id: "heart", label: "Coração", Icon: Heart },
]

type TagManagerModalProps = {
  open: boolean
  onClose: () => void
  tags: TagItem[]
  onUpdateTags: (newTags: TagItem[]) => void
}

export function TagManagerModal({ open, onClose, tags, onUpdateTags }: TagManagerModalProps) {
  const [tagName, setTagName] = useState("")
  const [selectedColor, setSelectedColor] = useState("#8b5cf6")
  const [selectedIcon, setSelectedIcon] = useState("tag")
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingTagId && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingTagId])

  if (!open) return null

  const handleSaveTag = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagName.trim()) return

    if (editingTagId) {
      const updated = tags.map((t) =>
        t.id === editingTagId
          ? { ...t, name: tagName.trim(), color: selectedColor, icon: selectedIcon }
          : t
      )
      onUpdateTags(updated)
      setEditingTagId(null)
    } else {
      const newTag: TagItem = {
        id: `tag_${Date.now()}`,
        name: tagName.trim(),
        color: selectedColor,
        icon: selectedIcon,
      }
      onUpdateTags([...tags, newTag])
    }

    setTagName("")
    setSelectedColor("#8b5cf6")
    setSelectedIcon("tag")
  }

  const handleStartEdit = (t: TagItem) => {
    setEditingTagId(t.id)
    setTagName(t.name)
    setSelectedColor(t.color)
    setSelectedIcon(t.icon || "tag")
  }

  const handleDeleteTag = (id: string) => {
    const updated = tags.filter((t) => t.id !== id)
    onUpdateTags(updated)
    if (editingTagId === id) {
      setEditingTagId(null)
      setTagName("")
      setSelectedColor("#8b5cf6")
      setSelectedIcon("tag")
    }
  }

  const PreviewIcon = tagIconMap[selectedIcon] || TagIcon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-card border border-border p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <TagIcon className="size-5" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-foreground">Gerenciar Tags</h3>
              <span className="flex items-center justify-center bg-muted text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {tags.length}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden flex-1">
          {/* Form Column */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-2">
            <form onSubmit={handleSaveTag} className="space-y-5 bg-muted/30 p-5 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">
                  {editingTagId ? "Editar Tag" : "Nova Tag"}
                </h4>
                
                {/* Live Preview */}
                <div 
                  className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border border-border bg-card shadow-sm transition-all"
                >
                  <span
                    className="flex items-center justify-center size-5 rounded-full text-white"
                    style={{ backgroundColor: selectedColor }}
                  >
                    <PreviewIcon className="size-3" />
                  </span>
                  <span className="text-foreground font-semibold truncate max-w-[100px]">
                    {tagName || "Preview"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Nome da Tag</label>
                <Input
                  ref={inputRef}
                  placeholder="Ex: Urgente, Mobile, UI..."
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className="rounded-xl text-sm"
                  required
                />
              </div>

              {/* Color Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Cor da Tag</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {colorPresets.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.name}
                      onClick={() => setSelectedColor(c.value)}
                      className={`size-8 rounded-full transition-all duration-200 ${
                        selectedColor === c.value ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card shadow-md" : "hover:scale-110 opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                  <div className="relative flex items-center justify-center size-8 rounded-full overflow-hidden border border-border group">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="absolute inset-[-10px] w-12 h-12 cursor-pointer opacity-0 z-10"
                      title="Escolher cor personalizada"
                    />
                    <div 
                      className="absolute inset-0 z-0 transition-transform group-hover:scale-110" 
                      style={{ backgroundColor: selectedColor }} 
                    />
                    <Palette className="size-3.5 text-white mix-blend-difference z-0 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Icon Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Ícone da Tag</label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {iconPresets.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedIcon(id)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all duration-200 ${
                        selectedIcon === id
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span className="text-[10px] truncate w-full text-center">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {editingTagId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTagId(null)
                      setTagName("")
                      setSelectedColor("#8b5cf6")
                      setSelectedIcon("tag")
                    }}
                    className="rounded-xl text-xs hover:bg-destructive/10 hover:text-destructive"
                  >
                    Cancelar
                  </Button>
                )}
                <Button type="submit" size="sm" className="rounded-xl text-xs flex items-center gap-1.5">
                  {editingTagId ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
                  <span>{editingTagId ? "Salvar" : "Adicionar"}</span>
                </Button>
              </div>
            </form>
          </div>

          {/* List Column */}
          <div className="flex flex-col overflow-hidden border border-border rounded-xl bg-card">
            <div className="bg-muted/50 p-3 border-b border-border">
              <h4 className="text-xs font-semibold text-muted-foreground">
                Suas Tags
              </h4>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {tags.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 text-muted-foreground">
                  <div className="p-3 bg-muted rounded-full">
                    <Tag className="size-6 opacity-50" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Nenhuma tag criada</p>
                    <p className="text-xs mt-1">Crie tags para organizar seus itens</p>
                  </div>
                </div>
              ) : (
                tags.map((t, index) => {
                  const TagIconComp = tagIconMap[t.icon || "tag"] || TagIcon
                  const isEditing = editingTagId === t.id
                  return (
                    <div
                      key={t.id || t.name}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 animate-in fade-in slide-in-from-left-2 ${
                        isEditing ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex items-center justify-center size-8 rounded-full text-white shadow-sm shrink-0"
                          style={{ backgroundColor: t.color }}
                        >
                          <TagIconComp className="size-4" />
                        </span>
                        <span className="text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-[180px]">
                          {t.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(t)}
                          className={`size-8 rounded-full ${isEditing ? "text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
                          title="Editar Tag"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTag(t.id || t.name)}
                          className="size-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Excluir Tag"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
