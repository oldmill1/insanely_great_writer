module DesktopItemPayloads
  extend ActiveSupport::Concern

  private

  def desktop_item_payload(item)
    shortcut = item.shortcut
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
end
