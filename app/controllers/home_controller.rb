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
  DESKTOP_WINDOWS = [].freeze

  def index
    ensure_demo_records!
    @notes = load_notes
    @desktop_shortcuts = load_shortcuts
    @desktop_windows = load_windows
    @context_menu_items = load_context_menu_items
  end

  def sandbox
    @sandbox_component = params[:id].to_s
  end

  private

  def ensure_demo_records!
    return unless authed?

    ensure_document_shortcuts!
  end

  def ensure_document_shortcuts!
    current_user.documents.active.includes(:shortcut).find_each do |document|
      document.create_desktop_shortcut! if document.shortcut.blank?
    end
  end

  def load_notes
    return [] unless authed?
    return [] unless Note.column_names.include?("user_id")

    Note.where(user_id: current_user.id).order(created_at: :asc).limit(2).map.with_index do |note, index|
      presentation = NOTE_PRESENTATIONS[index] || NOTE_PRESENTATIONS.last

      {
        id: note.id,
        title: note.title,
        content: note.content,
        top: note.top,
        right: note.right,
        bottom: note.bottom,
        left: note.left,
        expanded: note.expanded,
        variant: presentation[:variant],
        width: presentation[:width],
        height: presentation[:height]
      }
    end
  end

  def load_shortcuts
    return SYSTEM_SHORTCUTS.map(&:dup) unless authed?

    db_shortcuts = current_user.documents
      .active
      .includes(:shortcut)
      .order(created_at: :asc)
      .filter_map do |document|
        shortcut = document.shortcut
        next if shortcut.blank?

        {
          id: shortcut.id,
          document_id: document.id,
          kind: "record",
          top: shortcut.top,
          right: shortcut.right,
          bottom: shortcut.bottom,
          left: shortcut.left,
          thumbnail: shortcut.thumbnail,
          label: shortcut.label
        }
      end

    db_shortcuts + SYSTEM_SHORTCUTS.map(&:dup)
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

  def load_windows
    DESKTOP_WINDOWS.map(&:dup)
  end
end
