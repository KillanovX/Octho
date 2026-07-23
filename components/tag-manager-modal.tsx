"use client"

import React, { useState } from "react"
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
  "#8b5cf6", // Violet
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#6366f1", // Indigo
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
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <TagIcon className="size-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Gerenciar Tags</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {/* Tag Form */}
        <form onSubmit={handleSaveTag} className="space-y-4 bg-muted/40 p-4 rounded-xl border border-border">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {editingTagId ? "Editar Tag" : "Nova Tag"}
          </h4>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome da Tag</label>
            <Input
              placeholder="Ex: Urgente, Mobile, UI..."
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="rounded-xl text-sm"
              required
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cor da Tag</label>
            <div className="flex items-center gap-2 flex-wrap">
              {colorPresets.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`size-7 rounded-full transition-transform ${
                    selectedColor === c ? "scale-125 ring-2 ring-primary ring-offset-2 ring-offset-card" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="size-7 rounded-full cursor-pointer border-0 bg-transparent"
                title="Escolher cor personalizada"
              />
            </div>
          </div>

          {/* Icon Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Ícone da Tag</label>
            <div className="flex items-center gap-2 flex-wrap max-h-32 overflow-y-auto p-1">
              {iconPresets.map(({ id, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedIcon(id)}
                  className={`flex items-center justify-center size-8 rounded-lg border transition-colors ${
                    selectedIcon === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {editingTagId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingTagId(null)
                  setTagName("")
                }}
                className="rounded-xl text-xs"
              >
                Cancelar Edição
              </Button>
            )}
            <Button type="submit" size="sm" className="rounded-xl text-xs flex items-center gap-1.5">
              {editingTagId ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
              <span>{editingTagId ? "Salvar Alterações" : "Adicionar Tag"}</span>
            </Button>
          </div>
        </form>

        {/* Existing Tags List */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tags Existentes ({tags.length})
          </h4>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
            {tags.map((t) => {
              const TagIconComp = tagIconMap[t.icon || "tag"] || TagIcon
              return (
                <div
                  key={t.id || t.name}
                  className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border border-border bg-card shadow-sm"
                >
                  <span
                    className="flex items-center justify-center size-5 rounded-full text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    <TagIconComp className="size-3" />
                  </span>
                  <span className="text-foreground font-semibold">{t.name}</span>

                  <button
                    type="button"
                    onClick={() => handleStartEdit(t)}
                    className="text-muted-foreground hover:text-primary ml-1"
                    title="Editar Tag"
                  >
                    <Pencil className="size-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTag(t.id || t.name)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Excluir Tag"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Concluído
          </Button>
        </div>
      </div>
    </div>
  )
}
