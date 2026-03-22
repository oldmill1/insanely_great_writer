class HomeController < ApplicationController
  include DesktopItemPayloads

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
    @new_context_menu_items = load_new_context_menu_items
  end

  def desktop_items
    ensure_demo_records!

    render json: { shortcuts: load_shortcuts }
  end

  def sandbox
    @sandbox_component = params[:id].to_s
  end

  private

  def ensure_demo_records!
    return unless authed?

    ensure_root_shortcuts!
  end

  def ensure_root_shortcuts!
    VirtualFilesystem.root_children_for(current_user).values.flatten.each do |item|
      item.create_desktop_shortcut! if item.shortcut.blank?
    end
  end

  def load_notes
    return [] unless authed?
    return [] unless Note.column_names.include?("user_id")

    Note.where(user_id: current_user.id).order(created_at: :asc).map.with_index do |note, index|
      presentation = NOTE_PRESENTATIONS[index % NOTE_PRESENTATIONS.length]

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
        width: note.width || presentation[:width],
        height: note.height || presentation[:height]
      }
    end
  end

  def load_shortcuts
    return SYSTEM_SHORTCUTS.map(&:dup) unless authed?

    root_children = VirtualFilesystem.root_children_for(current_user)
    db_shortcuts = root_children[:folders].order(created_at: :asc).filter_map { |folder| desktop_item_payload(folder) } +
      root_children[:documents].order(created_at: :asc).filter_map { |document| desktop_item_payload(document) }

    db_shortcuts + SYSTEM_SHORTCUTS.map(&:dup)
  end

  def load_context_menu_items
    if authed?
      [
        { label: "New", intent: "new", kind: "action", submenu: "new" },
        "break",
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

  def load_new_context_menu_items
    return [] unless authed?

    [
      { label: "Folder", intent: "new_folder", kind: "action" },
      { label: "Document", intent: "new_document", kind: "action" },
      { label: "Note", intent: "new_note", kind: "action" }
    ]
  end

  def load_windows
    DESKTOP_WINDOWS.map(&:dup)
  end
end
