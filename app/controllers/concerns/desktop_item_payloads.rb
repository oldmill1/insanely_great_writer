module DesktopItemPayloads
  extend ActiveSupport::Concern

  private

  def desktop_item_payload(item)
    shortcut = current_shortcut_for(item)
    return if shortcut.blank?

    {
      id: shortcut.id,
      item_id: item.id,
      item_kind: item.kind,
      kind: "record",
      top: shortcut.top,
      right: shortcut.right,
      bottom: shortcut.bottom,
      left: shortcut.left,
      thumbnail: shortcut.thumbnail,
      label: shortcut.label
    }
  end

  def current_shortcut_for(item)
    shortcut = item.association(:shortcut).loaded? ? item.shortcut : item.shortcut
    return shortcut if shortcut.present?

    item.create_desktop_shortcut! if item.respond_to?(:root_level?) && item.root_level?
    item.reload.shortcut
  end
end
