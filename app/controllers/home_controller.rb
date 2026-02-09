class HomeController < ApplicationController
  NOTE_PRESENTATIONS = [
    { variant: "blue", width: "28rem", height: "12rem" },
    { variant: "yellow", width: "22rem", height: "10rem" }
  ].freeze
  SYSTEM_SHORTCUTS = [
    {
      id: "system-trash",
      system_key: "trash",
      kind: "system",
      top: 82,
      right: 84,
      thumbnail: "/icons/trash.png",
      label: "Trash"
    }
  ].freeze

  def index
    ensure_demo_records!
    @notes = load_notes
    @desktop_shortcuts = load_shortcuts
    @context_menu_items = load_context_menu_items
  end

  def sandbox
    @sandbox_component = params[:id].to_s
  end

  private

  def ensure_demo_records!
    ensure_two_notes!
    ensure_document_shortcuts!
  end

  def ensure_two_notes!
    if Note.count.zero?
      Note.create!(
        title: "First Draft",
        content: "Open threads:\n- Character arc for Chapter 3\n- Final paragraph tone"
      )
    end

    return if Note.count >= 2

    Note.create!(
      title: "Scene Grid",
      content: "Scene 12: Dock at sunrise.\nObjective: reveal the hidden tape before breakfast rush.",
      top: 112,
      right: 96
    )
  end

  def ensure_document_shortcuts!
    Document.includes(:shortcut).find_each do |document|
      document.create_desktop_shortcut! if document.shortcut.blank?
    end
  end

  def load_notes
    Note.order(created_at: :asc).limit(2).map.with_index do |note, index|
      presentation = NOTE_PRESENTATIONS[index] || NOTE_PRESENTATIONS.last

      {
        id: note.id,
        title: note.title,
        content: note.content,
        top: note.top,
        right: note.right,
        bottom: note.bottom,
        left: note.left,
        variant: presentation[:variant],
        width: presentation[:width],
        height: presentation[:height]
      }
    end
  end

  def load_shortcuts
    db_shortcuts = Shortcut.order(created_at: :asc).map do |shortcut|
      {
        id: shortcut.id,
        kind: "record",
        top: shortcut.top,
        right: shortcut.right,
        bottom: shortcut.bottom,
        left: shortcut.left,
        thumbnail: shortcut.thumbnail,
        label: shortcut.label
      }
    end

    db_shortcuts + SYSTEM_SHORTCUTS
  end

  def load_context_menu_items
    if authed?
      [
        { label: "Logout", intent: "logout", kind: "action" },
        { label: "User Settings", intent: "user_settings", kind: "action" }
      ]
    else
      [
        { label: "Login", intent: "login", kind: "action" },
        { label: "Register", intent: "register", kind: "action" }
      ]
    end
  end
end
