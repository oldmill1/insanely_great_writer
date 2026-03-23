class UserSidebarShortcutsController < ApplicationController
  before_action :authenticate_user!

  def create
    item_kind = params[:item_kind].to_s
    item_id = params[:item_id].presence
    item = find_sidebar_item(item_kind, item_id)
    return head :not_found if item.blank?

    shortcut = current_user.user_sidebar_shortcuts.find_or_initialize_by(
      target_key: "#{item.kind}:#{item.id}"
    )

    if shortcut.new_record?
      shortcut.item_kind = item.kind
      shortcut.item_id = item.id
      shortcut.label = item.kind == UserSidebarShortcut::FOLDER_KIND ? item.name : item.title
      shortcut.thumbnail = item.kind == UserSidebarShortcut::FOLDER_KIND ? Folder::FOLDER_SHORTCUT_THUMBNAIL : Document::DOC_SHORTCUT_THUMBNAIL
      shortcut.position = UserSidebarShortcut.next_position_for(current_user)
      shortcut.save!
    end

    render json: { shortcut: sidebar_shortcut_payload(shortcut, item:) }, status: :ok
  end

  def destroy
    shortcut = current_user.user_sidebar_shortcuts.find(params[:id])
    shortcut.destroy!

    render json: { deleted: true, shortcut_id: shortcut.id }, status: :ok
  end

  private

  def find_sidebar_item(item_kind, item_id)
    case item_kind
    when UserSidebarShortcut::FOLDER_KIND
      current_user.folders.active.find_by(id: item_id)
    when UserSidebarShortcut::DOCUMENT_KIND
      current_user.documents.active.find_by(id: item_id)
    end
  end

  def sidebar_shortcut_payload(shortcut, item:)
    {
      id: shortcut.id,
      target_key: shortcut.target_key,
      item_kind: shortcut.item_kind,
      item_id: shortcut.item_id,
      label: shortcut.label,
      thumbnail: shortcut.thumbnail,
      actionable: true,
      show_path: shortcut.folder? ? folder_path(item) : nil
    }
  end
end
