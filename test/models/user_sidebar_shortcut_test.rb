require "test_helper"

class UserSidebarShortcutTest < ActiveSupport::TestCase
  test "ensures a default desktop shortcut for a user" do
    user = users(:one)
    user.user_sidebar_shortcuts.delete_all

    shortcut = UserSidebarShortcut.ensure_default_desktop_for(user)

    assert_equal user, shortcut.user
    assert_equal "desktop", shortcut.item_kind
    assert_equal "desktop", shortcut.target_key
    assert_equal "Desktop", shortcut.label
    assert_equal "/icons/folders/blue.png", shortcut.thumbnail
  end

  test "requires item ids for folder and document shortcuts" do
    shortcut = UserSidebarShortcut.new(
      user: users(:one),
      target_key: "folder:",
      item_kind: "folder",
      label: "Broken",
      thumbnail: Folder::FOLDER_SHORTCUT_THUMBNAIL,
      position: 1
    )

    assert_not shortcut.valid?
    assert_includes shortcut.errors[:item_id], "must be present for folder and document shortcuts"
  end
end
